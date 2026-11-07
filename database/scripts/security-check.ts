import { config } from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

config({ quiet: true });

function env(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    console.error(`Не задана переменная окружения ${name} (см. README, раздел «Переменные окружения»)`);
    process.exit(2);
  }
  return value;
}

const SUPABASE_URL = env('SUPABASE_URL');
const SUPABASE_ANON_KEY = env('SUPABASE_ANON_KEY');
const MANAGER_EMAIL = env('MANAGER_EMAIL', 'manager@test.ru');
const EXECUTOR1_EMAIL = env('EXECUTOR1_EMAIL', 'executor1@test.ru');
const EXECUTOR2_EMAIL = env('EXECUTOR2_EMAIL', 'executor2@test.ru');
const MANAGER_PASSWORD = env('MANAGER_PASSWORD');
const EXECUTOR1_PASSWORD = env('EXECUTOR1_PASSWORD');
const EXECUTOR2_PASSWORD = env('EXECUTOR2_PASSWORD');

if (/service_role|sb_secret_/.test(SUPABASE_ANON_KEY)) {
  console.error('Похоже, в SUPABASE_ANON_KEY указан секретный ключ. Нужен anon / publishable.');
  process.exit(2);
}

type Result = { error: { message: string; code?: string } | null; data?: unknown };

let passed = 0;
let failed = 0;

function report(ok: boolean, name: string, details?: string): void {
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}${details ? `  — ${details}` : ''}`);
}

function isEmpty(data: unknown): boolean {
  return data === null || data === undefined || (Array.isArray(data) && data.length === 0);
}

async function expectDenied(name: string, run: () => PromiseLike<Result>): Promise<void> {
  try {
    const { error, data } = await run();
    if (error) report(true, name, `ошибка: ${error.message}`);
    else if (isEmpty(data)) report(true, name, '0 строк');
    else report(false, name, `запрос прошёл: ${JSON.stringify(data).slice(0, 200)}`);
  } catch (e) {
    report(true, name, `исключение: ${(e as Error).message}`);
  }
}

async function expectError(name: string, run: () => PromiseLike<Result>): Promise<void> {
  const { error, data } = await run();
  if (error) report(true, name, `ошибка: ${error.message}`);
  else report(false, name, `запрос прошёл: ${JSON.stringify(data).slice(0, 200)}`);
}

async function expectOk(name: string, run: () => PromiseLike<Result>): Promise<void> {
  const { error } = await run();
  report(!error, name, error ? `ошибка: ${error.message}` : undefined);
}

function newClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(email: string, password: string): Promise<{ client: SupabaseClient; id: string }> {
  const client = newClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    console.error(`Не удалось войти как ${email}: ${error?.message}`);
    process.exit(2);
  }
  return { client, id: data.user.id };
}

function section(title: string): void {
  console.log(`\n— ${title}`);
}

const TABLES = ['profiles', 'sites', 'tasks', 'task_status_history'] as const;

async function main(): Promise<void> {
  console.log(`Проверка безопасности: ${SUPABASE_URL}\n`);

  const anon = newClient();
  const manager = await signIn(MANAGER_EMAIL, MANAGER_PASSWORD);
  const ex1 = await signIn(EXECUTOR1_EMAIL, EXECUTOR1_PASSWORD);
  const ex2 = await signIn(EXECUTOR2_EMAIL, EXECUTOR2_PASSWORD);
  const m = manager.client;
  const e1 = ex1.client;
  const e2 = ex2.client;

  const stamp = new Date().toISOString();
  const siteA = await m.from('sites').insert({ name: `[security-check] A ${stamp}`, address: 'тест' }).select().single();
  const siteB = await m.from('sites').insert({ name: `[security-check] B ${stamp}`, address: 'тест' }).select().single();
  if (siteA.error || siteB.error) {
    console.error('Постановщик не смог создать тестовые объекты:', siteA.error?.message ?? siteB.error?.message);
    console.error('Проверьте, что roles.sql выполнен (manager@test.ru — manager).');
    process.exit(2);
  }
  const taskA = await m
    .from('tasks')
    .insert({ site_id: siteA.data.id, title: 'Задача A', assignee_id: ex1.id })
    .select()
    .single();
  const taskB = await m
    .from('tasks')
    .insert({ site_id: siteB.data.id, title: 'Задача B', assignee_id: ex2.id })
    .select()
    .single();
  if (taskA.error || taskB.error) {
    console.error('Постановщик не смог создать тестовые задачи:', taskA.error?.message ?? taskB.error?.message);
    process.exit(2);
  }
  const A = taskA.data.id as string;
  const B = taskB.data.id as string;
  const rpc = (c: SupabaseClient, id: string, to: string, comment?: string) =>
    c.rpc('change_task_status', { p_task_id: id, p_to: to, p_comment: comment ?? null });

  try {
    section('1. Без входа (anon) ничего не видно');
    for (const t of TABLES) {
      await expectDenied(`anon: select из ${t}`, () => anon.from(t).select('*').limit(5));
    }
    await expectError('anon: вызов change_task_status', () => rpc(anon, A, 'in_progress'));

    section('2. Исполнитель видит только свои задачи');
    {
      const { data, error } = await e1.from('tasks').select('id, assignee_id');
      const own = !error && (data ?? []).length > 0 && (data ?? []).every((r) => r.assignee_id === ex1.id);
      report(own, 'executor1: в списке задач только свои', error?.message ?? `${data?.length ?? 0} задач(и)`);
    }
    await expectDenied('executor1: чужая задача по id', () => e1.from('tasks').select('*').eq('id', B));
    await expectDenied('executor1: история чужой задачи', () =>
      e1.from('task_status_history').select('*').eq('task_id', B),
    );

    section('3. Исполнитель не видит объекты без своих задач');
    await expectDenied('executor1: объект без его задач по id', () => e1.from('sites').select('*').eq('id', siteB.data.id));
    {
      const { data } = await e1.from('sites').select('id').eq('id', siteA.data.id);
      report((data ?? []).length === 1, 'контроль: executor1 видит объект со своей задачей');
    }

    section('4. Исполнитель не может напрямую сменить статус');
    await expectDenied('executor1: update tasks set status = in_progress (своя задача)', () =>
      e1.from('tasks').update({ status: 'in_progress' }).eq('id', A).select(),
    );

    section('5. Исполнитель не может редактировать, создавать, удалять');
    await expectDenied('executor1: изменить название своей задачи', () =>
      e1.from('tasks').update({ title: 'взлом' }).eq('id', A).select(),
    );
    await expectDenied('executor1: сменить исполнителя своей задачи', () =>
      e1.from('tasks').update({ assignee_id: ex2.id }).eq('id', A).select(),
    );
    await expectDenied('executor1: создать задачу', () =>
      e1.from('tasks').insert({ site_id: siteA.data.id, title: 'взлом', assignee_id: ex1.id }).select(),
    );
    await expectDenied('executor1: удалить свою задачу', () => e1.from('tasks').delete().eq('id', A).select());
    await expectDenied('executor1: создать объект', () =>
      e1.from('sites').insert({ name: 'взлом', address: 'взлом' }).select(),
    );
    await expectDenied('executor1: изменить объект', () =>
      e1.from('sites').update({ name: 'взлом' }).eq('id', siteA.data.id).select(),
    );
    await expectDenied('executor1: удалить объект', () => e1.from('sites').delete().eq('id', siteA.data.id).select());
    {
      const { data } = await m.from('tasks').select('title, assignee_id, status').eq('id', A).single();
      report(
        data?.title === 'Задача A' && data?.assignee_id === ex1.id && data?.status === 'new',
        'контроль: задача A не изменилась',
      );
    }

    section('6. Запрещённые переходы через RPC');
    await expectError('executor1: new → accepted', () => rpc(e1, A, 'accepted'));
    await expectError('executor1: new → review', () => rpc(e1, A, 'review'));
    await expectError('manager: new → accepted', () => rpc(m, B, 'accepted'));
    await expectOk('контроль: executor1 new → in_progress (разрешено)', () => rpc(e1, A, 'in_progress'));
    await expectError('executor1: in_progress → accepted', () => rpc(e1, A, 'accepted'));
    await expectError('manager: in_progress → accepted', () => rpc(m, A, 'accepted'));
    await expectError('manager: in_progress → review (это делает исполнитель)', () => rpc(m, A, 'review'));

    section('7. RPC на чужую задачу');
    await expectError('executor1: change_task_status задачи executor2', () => rpc(e1, B, 'in_progress'));

    section('8. Исполнитель не может принять или вернуть свою задачу');
    await expectOk('контроль: executor1 in_progress → review (разрешено)', () => rpc(e1, A, 'review'));
    await expectError('executor1: review → accepted', () => rpc(e1, A, 'accepted'));
    await expectError('executor1: review → rework', () => rpc(e1, A, 'rework', 'сам себе'));

    section('9. Историю нельзя менять никому');
    {
      const { data: hist } = await m.from('task_status_history').select('id').eq('task_id', A).limit(1).single();
      const histId = hist?.id as number | undefined;
      for (const [who, c, uid] of [
        ['executor1', e1, ex1.id],
        ['manager', m, manager.id],
      ] as const) {
        await expectDenied(`${who}: insert в task_status_history`, () =>
          c.from('task_status_history').insert({ task_id: A, from_status: 'review', to_status: 'accepted', changed_by: uid }).select(),
        );
        await expectDenied(`${who}: update task_status_history`, () =>
          c.from('task_status_history').update({ comment: 'подделка' }).eq('id', histId ?? -1).select(),
        );
        await expectDenied(`${who}: delete из task_status_history`, () =>
          c.from('task_status_history').delete().eq('task_id', A).select(),
        );
      }
    }

    section('10. Исполнитель не может стать постановщиком');
    await expectDenied('executor1: update profiles set role = manager', () =>
      e1.from('profiles').update({ role: 'manager' }).eq('id', ex1.id).select(),
    );
    await e1.auth.updateUser({ data: { role: 'manager' } });
    await expectError('executor1: после updateUser({role:"manager"}) всё равно нельзя принять задачу', () =>
      rpc(e1, A, 'accepted'),
    );
    {
      const { data } = await m.from('profiles').select('role').eq('id', ex1.id).single();
      report(data?.role === 'executor', 'контроль: роль executor1 осталась executor');
    }

    section('11. Регистрация отключена');
    await expectError('signUp нового пользователя', () =>
      newClient().auth.signUp({ email: `hacker+${Date.now()}@test.ru`, password: 'Passw0rd!Passw0rd' }),
    );

    section('12. Возврат на доработку только с комментарием');
    await expectError('manager: review → rework без комментария', () => rpc(m, A, 'rework'));
    await expectError('manager: review → rework с комментарием из пробелов', () => rpc(m, A, 'rework', '   '));
    await expectOk('контроль: manager review → rework с комментарием (разрешено)', () =>
      rpc(m, A, 'rework', 'Проверка безопасности'),
    );

    section('13. Постановщик не может напрямую менять status и created_by');
    await expectDenied('manager: update tasks set status = accepted', () =>
      m.from('tasks').update({ status: 'accepted' }).eq('id', A).select(),
    );
    await expectDenied('manager: update tasks set created_by', () =>
      m.from('tasks').update({ created_by: ex1.id }).eq('id', A).select(),
    );
    await expectDenied('manager: insert задачи сразу со статусом accepted', () =>
      m.from('tasks').insert({ site_id: siteA.data.id, title: 'x', assignee_id: ex1.id, status: 'accepted' }).select(),
    );
    await expectDenied('manager: назначить исполнителем постановщика', () =>
      m.from('tasks').update({ assignee_id: manager.id }).eq('id', A).select(),
    );

    section('Дополнительно: принятую задачу изменить нельзя');
    await expectOk('контроль: executor1 rework → in_progress', () => rpc(e1, A, 'in_progress'));
    await expectOk('контроль: executor1 in_progress → review', () => rpc(e1, A, 'review'));
    await expectOk('контроль: manager review → accepted', () => rpc(m, A, 'accepted'));
    await expectDenied('manager: изменить название принятой задачи', () =>
      m.from('tasks').update({ title: 'после приёмки' }).eq('id', A).select(),
    );
    await expectError('manager: accepted → rework', () => rpc(m, A, 'rework', 'ещё раз'));
    {
      const { data } = await m.from('task_status_history').select('from_status, to_status').eq('task_id', A).order('id');
      const chain = (data ?? []).map((r) => r.to_status).join(' → ');
      report(
        chain === 'new → in_progress → review → rework → in_progress → review → accepted',
        'контроль: история задачи A — полная цепочка',
        chain,
      );
    }
  } finally {
    await e1.auth.updateUser({ data: { role: null } });
    await m.from('tasks').delete().in('id', [A, B]);
    await m.from('sites').delete().in('id', [siteA.data.id, siteB.data.id]);
  }

  console.log(`\nИтого: ✅ ${passed}  ❌ ${failed}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(2);
});
