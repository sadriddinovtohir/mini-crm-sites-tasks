import { useState } from 'react';
import { Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core';
import { useChangeStatus } from '../api/tasks';
import { useAuth } from '../auth/AuthContext';
import { notifyError, notifySuccess } from '../lib/errors';
import { getAvailableActions, STATUS_LABELS, type TaskAction } from '../lib/statuses';
import type { Task } from '../types';

const MAX_COMMENT = 2000;

export function TaskActions({ task }: { task: Pick<Task, 'id' | 'status' | 'assignee_id'> }) {
  const { profile } = useAuth();
  const change = useChangeStatus();
  const [action, setAction] = useState<TaskAction | null>(null);
  const [comment, setComment] = useState('');
  const [touched, setTouched] = useState(false);

  const actions = getAvailableActions(task, profile);
  if (actions.length === 0) return null;

  const commentError =
    action?.requiresComment && touched && !comment.trim()
      ? 'Комментарий обязателен'
      : comment.length > MAX_COMMENT
        ? `Не больше ${MAX_COMMENT} символов`
        : null;

  const open = (a: TaskAction) => {
    setAction(a);
    setComment('');
    setTouched(false);
  };
  const close = () => setAction(null);

  const confirm = () => {
    if (!action) return;
    setTouched(true);
    if ((action.requiresComment && !comment.trim()) || comment.length > MAX_COMMENT) return;
    change.mutate(
      { taskId: task.id, to: action.to, comment: comment.trim() || null },
      {
        onSuccess: () => {
          notifySuccess(`Статус изменён: «${STATUS_LABELS[action.to]}»`);
          close();
        },
        onError: (e) => notifyError(e, 'Не удалось сменить статус'),
      },
    );
  };

  return (
    <>
      <Group>
        {actions.map((a) => (
          <Button key={a.to} color={a.color} onClick={() => open(a)}>
            {a.label}
          </Button>
        ))}
      </Group>

      <Modal opened={action !== null} onClose={close} title={action?.label}>
        <Stack>
          {action && (
            <Text size="sm">
              Новый статус: <b>{STATUS_LABELS[action.to]}</b>
            </Text>
          )}
          <Textarea
            label={action?.requiresComment ? 'Комментарий (обязательно)' : 'Комментарий (необязательно)'}
            placeholder={action?.requiresComment ? 'Что нужно исправить?' : ''}
            autosize
            minRows={3}
            value={comment}
            onChange={(e) => setComment(e.currentTarget.value)}
            onBlur={() => setTouched(true)}
            error={commentError}
            withAsterisk={action?.requiresComment}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              Отмена
            </Button>
            <Button color={action?.color} loading={change.isPending} onClick={confirm}>
              Подтвердить
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
