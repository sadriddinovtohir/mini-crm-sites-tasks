import { Badge } from '@mantine/core';
import { STATUS_COLORS, STATUS_LABELS } from '../lib/statuses';
import type { TaskStatus } from '../types';

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge color={STATUS_COLORS[status]} variant="light">
      {STATUS_LABELS[status]}
    </Badge>
  );
}
