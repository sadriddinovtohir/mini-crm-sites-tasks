import { useEffect } from 'react';
import { Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useSaveSite } from '../api/sites';
import { notifyError, notifySuccess } from '../lib/errors';
import type { Site } from '../types';

type Props = {
  opened: boolean;
  onClose: () => void;
  site?: Pick<Site, 'id' | 'name' | 'address'> | null;
};

export function SiteFormModal({ opened, onClose, site }: Props) {
  const save = useSaveSite();
  const form = useForm({
    initialValues: { name: '', address: '' },
    validate: {
      name: (v) => (v.trim() ? null : 'Укажите название'),
      address: (v) => (v.trim() ? null : 'Укажите адрес'),
    },
  });

  useEffect(() => {
    if (opened) form.setValues({ name: site?.name ?? '', address: site?.address ?? '' });
  }, [opened, site]);

  const submit = form.onSubmit((values) => {
    save.mutate(
      { id: site?.id, input: { name: values.name.trim(), address: values.address.trim() } },
      {
        onSuccess: () => {
          notifySuccess(site ? 'Объект сохранён' : 'Объект создан');
          onClose();
        },
        onError: (e) => notifyError(e),
      },
    );
  });

  return (
    <Modal opened={opened} onClose={onClose} title={site ? 'Редактировать объект' : 'Новый объект'}>
      <form onSubmit={submit}>
        <Stack>
          <TextInput label="Название" withAsterisk {...form.getInputProps('name')} />
          <TextInput label="Адрес" withAsterisk {...form.getInputProps('address')} />
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
