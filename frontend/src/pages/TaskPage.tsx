import { Anchor, Divider, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { Link, useParams } from 'react-router';
import { useTask } from '../api/tasks';
import { EmptyState, ErrorState, PageLoader } from '../components/PageState';
import { StatusBadge } from '../components/StatusBadge';
import { TaskActions } from '../components/TaskActions';
import { TaskHistory } from '../components/TaskHistory';
import { formatDateTime } from '../lib/format';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <div>{children}</div>
    </div>
  );
}

export function TaskPage() {
  const { id } = useParams();
  const task = useTask(id);

  if (task.isPending) return <PageLoader />;
  if (task.isError) return <ErrorState error={task.error} />;
  if (!task.data) return <EmptyState>Задача не найдена</EmptyState>;

  const t = task.data;

  return (
    <Stack>
      {t.site && (
        <Anchor component={Link} to={`/sites/${t.site.id}`} size="sm">
          ← {t.site.name}
        </Anchor>
      )}

      <Paper withBorder p="lg">
        <Stack>
          <Group justify="space-between" align="flex-start">
            <Title order={2}>{t.title}</Title>
            <StatusBadge status={t.status} />
          </Group>

          <Text style={{ whiteSpace: 'pre-wrap' }} c={t.description ? undefined : 'dimmed'}>
            {t.description || 'Без описания'}
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
            <Field label="Объект">
              {t.site ? (
                <Anchor component={Link} to={`/sites/${t.site.id}`}>
                  {t.site.name}
                </Anchor>
              ) : (
                '—'
              )}
            </Field>
            <Field label="Исполнитель">{t.assignee?.full_name ?? '—'}</Field>
            <Field label="Автор">{t.author?.full_name ?? '—'}</Field>
            <Field label="Создана">{formatDateTime(t.created_at)}</Field>
          </SimpleGrid>

          <TaskActions task={t} />
        </Stack>
      </Paper>

      <Paper withBorder p="lg">
        <Title order={4}>История</Title>
        <Divider my="sm" />
        <TaskHistory taskId={t.id} />
      </Paper>
    </Stack>
  );
}
