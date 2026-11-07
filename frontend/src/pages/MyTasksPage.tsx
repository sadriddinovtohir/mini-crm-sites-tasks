import { useState } from 'react';
import { Anchor, Group, Paper, Select, Stack, Table, Title } from '@mantine/core';
import { Link, Navigate } from 'react-router';
import { useMyTasks } from '../api/tasks';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, ErrorState, PageLoader } from '../components/PageState';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime } from '../lib/format';
import { STATUS_LABELS, STATUS_ORDER } from '../lib/statuses';
import type { TaskStatus } from '../types';

const FILTER_OPTIONS = [
  { value: 'all', label: 'Все статусы' },
  ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
];

export function MyTasksPage() {
  const { profile } = useAuth();
  const [filter, setFilter] = useState<string>('all');
  const status = filter === 'all' ? null : (filter as TaskStatus);
  const tasks = useMyTasks(profile?.id, status);

  if (profile?.role !== 'executor') return <Navigate to="/sites" replace />;

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Мои задачи</Title>
        <Select
          aria-label="Фильтр по статусу"
          data={FILTER_OPTIONS}
          value={filter}
          onChange={(v) => setFilter(v ?? 'all')}
          allowDeselect={false}
          w={220}
        />
      </Group>

      <Paper withBorder>
        {tasks.isPending ? (
          <PageLoader />
        ) : tasks.isError ? (
          <ErrorState error={tasks.error} />
        ) : tasks.data.length === 0 ? (
          <EmptyState>{status ? 'Нет задач с таким статусом' : 'У вас пока нет задач'}</EmptyState>
        ) : (
          <Table.ScrollContainer minWidth={600}>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Задача</Table.Th>
                  <Table.Th>Объект</Table.Th>
                  <Table.Th>Статус</Table.Th>
                  <Table.Th>Обновлена</Table.Th>
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
                    <Table.Td>
                      {t.site ? (
                        <Anchor component={Link} to={`/sites/${t.site.id}`}>
                          {t.site.name}
                        </Anchor>
                      ) : (
                        '—'
                      )}
                    </Table.Td>
                    <Table.Td>
                      <StatusBadge status={t.status} />
                    </Table.Td>
                    <Table.Td>{formatDateTime(t.updated_at)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>
    </Stack>
  );
}
