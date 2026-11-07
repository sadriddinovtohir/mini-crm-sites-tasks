import { useEffect } from 'react';
import { Button, Group, Modal, Select, Stack, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useExecutors, useSaveTask } from '../api/tasks';
import { notifyError, notifySuccess } from '../lib/errors';
import type { Task } from '../types';

type Props = {
  opened: boolean;
  onClose: () => void;
  siteId: string;
  task?: Pick<Task, 'id' | 'title' | 'description' | 'assignee_id'> | null;
};

export function TaskFormModal({ opened, onClose, siteId, task }: Props) {
  const save = useSaveTask();
  const executors = useExecutors();

  const form = useForm({
    initialValues: { title: '', description: '', assignee_id: '' },
    validate: {
      title: (v) => (v.trim() ? null : 'Укажите название'),
      assignee_id: (v) => (v ? null : 'Выберите исполнителя'),
    },
  });

  useEffect(() => {
    if (opened) {
      form.setValues({
        title: task?.title ?? '',
        description: task?.description ?? '',
        assignee_id: task?.assignee_id ?? '',
      });
    }
  }, [opened, task]);

  const submit = form.onSubmit((values) => {
    save.mutate(
      {
        id: task?.id,
        input: {
          site_id: siteId,
          title: values.title.trim(),
          description: values.description.trim() || null,
          assignee_id: values.assignee_id,
        },
      },
      {
        onSuccess: () => {
          notifySuccess(task ? 'Задача сохранена' : 'Задача создана');
          onClose();
        },
        onError: (e) => notifyError(e),
      },
    );
  });

  return (
    <Modal opened={opened} onClose={onClose} title={task ? 'Редактировать задачу' : 'Новая задача'} size="lg">
      <form onSubmit={submit}>
        <Stack>
          <TextInput label="Название" withAsterisk {...form.getInputProps('title')} />
          <Textarea label="Описание" autosize minRows={3} {...form.getInputProps('description')} />
          <Select
            label="Исполнитель"
            withAsterisk
            placeholder={executors.isPending ? 'Загрузка…' : 'Выберите исполнителя'}
            data={(executors.data ?? []).map((p) => ({ value: p.id, label: p.full_name }))}
            nothingFoundMessage="Нет исполнителей"
            searchable
            {...form.getInputProps('assignee_id')}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" loading={save.isPending}>
              Сохранить
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
