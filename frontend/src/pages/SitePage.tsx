import { useState } from 'react';
import { Anchor, Button, Group, Paper, Stack, Table, Text, Title } from '@mantine/core';
import { modals } from '@mantine/modals';
import { Link, useParams } from 'react-router';
import { useSite } from '../api/sites';
import { useDeleteTask, useSiteTasks } from '../api/tasks';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, ErrorState, PageLoader } from '../components/PageState';
import { StatusBadge } from '../components/StatusBadge';
import { TaskFormModal } from '../components/TaskFormModal';
import { notifyError, notifySuccess } from '../lib/errors';
import { formatDateTime } from '../lib/format';
import { isTaskEditable } from '../lib/statuses';
import type { Task } from '../types';

type EditableTask = Pick<Task, 'id' | 'title' | 'description' | 'assignee_id'>;
type EditState = { open: false } | { open: true; task: EditableTask | null };

export function SitePage() {
  const { id } = useParams();
  const { profile } = useAuth();
  const isManager = profile?.role === 'manager';
  const site = useSite(id);
  const tasks = useSiteTasks(id);
  const remove = useDeleteTask();
  const [edit, setEdit] = useState<EditState>({ open: false });

  if (site.isPending) return <PageLoader />;
  if (site.isError) return <ErrorState error={site.error} />;
  if (!site.data) return <EmptyState>Объект не найден</EmptyState>;

  const confirmDelete = (task: Pick<Task, 'id' | 'title'>) =>
    modals.openConfirmModal({
      title: 'Удалить задачу?',
      children: <Text size="sm">Задача «{task.title}» и вся её история будут удалены.</Text>,
      labels: { confirm: 'Удалить', cancel: 'Отмена' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        remove.mutate(task.id, {
          onSuccess: () => notifySuccess('Задача удалена'),
          onError: (e) => notifyError(e, 'Не удалось удалить задачу'),
        }),
    });

  return (
    <Stack>
      <Anchor component={Link} to="/sites" size="sm">
        ← Все объекты
      </Anchor>
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>{site.data.name}</Title>
          <Text c="dimmed">{site.data.address}</Text>
        </div>
        {isManager && <Button onClick={() => setEdit({ open: true, task: null })}>Создать задачу</Button>}
      </Group>

      <Paper withBorder>
        {tasks.isPending ? (
          <PageLoader />
        ) : tasks.isError ? (
          <ErrorState error={tasks.error} />
        ) : tasks.data.length === 0 ? (
          <EmptyState>Задач пока нет</EmptyState>
        ) : (
          <Table.ScrollContainer minWidth={700}>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Задача</Table.Th>
                  <Table.Th>Исполнитель</Table.Th>
                  <Table.Th>Статус</Table.Th>
                  <Table.Th>Обновлена</Table.Th>
                  {isManager && <Table.Th />}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {tasks.data.map((t) => (
                  <Table.Tr key={t.id}>
                    <Table.Td>
                      <Anchor component={Link} to={`/tasks/${t.id}`}>
                        {t.title}
                      </Anchor>
                    </Table.Td>
                    <Table.Td>{t.assignee?.full_name ?? '—'}</Table.Td>
                    <Table.Td>
                      <StatusBadge status={t.status} />
                    </Table.Td>
                    <Table.Td>{formatDateTime(t.updated_at)}</Table.Td>
                    {isManager && (
                      <Table.Td>
                        <Group gap="xs" justify="flex-end" wrap="nowrap">
                          {isTaskEditable(t) && (
                            <Button size="xs" variant="default" onClick={() => setEdit({ open: true, task: t })}>
                              Редактировать
                            </Button>
                          )}
                          <Button size="xs" color="red" variant="light" onClick={() => confirmDelete(t)}>
                            Удалить
                          </Button>
                        </Group>
                      </Table.Td>
                    )}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>

      {isManager && (
        <TaskFormModal
          opened={edit.open}
          siteId={site.data.id}
          task={edit.open ? edit.task : null}
          onClose={() => setEdit({ open: false })}
        />
      )}
    </Stack>
  );
}
