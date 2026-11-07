import type { Profile, Task, TaskStatus, UserRole } from '../types';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  review: 'На проверке',
  accepted: 'Принята',
  rework: 'На доработке',
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  new: 'gray',
  in_progress: 'blue',
  review: 'yellow',
  accepted: 'green',
  rework: 'red',
};

export const STATUS_ORDER: TaskStatus[] = ['new', 'in_progress', 'review', 'rework', 'accepted'];

export const ROLE_LABELS: Record<UserRole, string> = {
  manager: 'Постановщик',
  executor: 'Исполнитель',
};

export type TaskAction = {
  to: TaskStatus;
  label: string;
  color: string;
  requiresComment: boolean;
};

type Transition = {
  from: TaskStatus;
  to: TaskStatus;
  who: 'assignee' | 'manager';
  label: string;
  color: string;
  requiresComment?: boolean;
};

const TRANSITIONS: Transition[] = [
  { from: 'new', to: 'in_progress', who: 'assignee', label: 'Взять в работу', color: 'blue' },
  { from: 'in_progress', to: 'review', who: 'assignee', label: 'Отправить на проверку', color: 'yellow' },
  { from: 'review', to: 'accepted', who: 'manager', label: 'Принять', color: 'green' },
  { from: 'review', to: 'rework', who: 'manager', label: 'Вернуть на доработку', color: 'red', requiresComment: true },
  { from: 'rework', to: 'in_progress', who: 'assignee', label: 'Взять в работу', color: 'blue' },
];

export function getAvailableActions(
  task: Pick<Task, 'status' | 'assignee_id'>,
  user: Pick<Profile, 'id' | 'role'> | null,
): TaskAction[] {
  if (!user) return [];
  return TRANSITIONS.filter((t) => {
    if (t.from !== task.status) return false;
    if (t.who === 'manager') return user.role === 'manager';
    return task.assignee_id === user.id;
  }).map((t) => ({
    to: t.to,
    label: t.label,
    color: t.color,
    requiresComment: t.requiresComment ?? false,
  }));
}

export function isTaskEditable(task: Pick<Task, 'status'>): boolean {
  return task.status !== 'accepted';
}
