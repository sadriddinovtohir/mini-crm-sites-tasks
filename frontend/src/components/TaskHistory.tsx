import { Table, Text } from '@mantine/core';
import { useTaskHistory } from '../api/tasks';
import { formatDateTime } from '../lib/format';
import { EmptyState, ErrorState, PageLoader } from './PageState';
import { StatusBadge } from './StatusBadge';

export function TaskHistory({ taskId }: { taskId: string }) {
  const history = useTaskHistory(taskId);

  if (history.isPending) return <PageLoader />;
  if (history.isError) return <ErrorState error={history.error} />;
  if (history.data.length === 0) return <EmptyState>История пуста</EmptyState>;

  return (
    <Table.ScrollContainer minWidth={600}>
      <Table striped verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Когда</Table.Th>
            <Table.Th>Кто</Table.Th>
            <Table.Th>Переход</Table.Th>
            <Table.Th>Комментарий</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {history.data.map((h) => (
            <Table.Tr key={h.id}>
              <Table.Td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(h.created_at)}</Table.Td>
              <Table.Td>{h.changer?.full_name ?? '—'}</Table.Td>
              <Table.Td style={{ whiteSpace: 'nowrap' }}>
                {h.from_status ? <StatusBadge status={h.from_status} /> : <Text span c="dimmed">—</Text>}
                <Text span mx={6}>
                  →
                </Text>
                <StatusBadge status={h.to_status} />
              </Table.Td>
              <Table.Td style={{ whiteSpace: 'pre-wrap' }}>{h.comment ?? ''}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
