import { useState } from 'react';
import { Anchor, Button, Group, Paper, Stack, Table, Text, Title } from '@mantine/core';
import { modals } from '@mantine/modals';
import { Link } from 'react-router';
import { useDeleteSite, useSites } from '../api/sites';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, ErrorState, PageLoader } from '../components/PageState';
import { SiteFormModal } from '../components/SiteFormModal';
import { notifyError, notifySuccess } from '../lib/errors';
import { formatDate } from '../lib/format';
import type { Site } from '../types';

type EditState = { open: false } | { open: true; site: Pick<Site, 'id' | 'name' | 'address'> | null };

export function SitesPage() {
  const { profile } = useAuth();
  const isManager = profile?.role === 'manager';
  const sites = useSites();
  const remove = useDeleteSite();
  const [edit, setEdit] = useState<EditState>({ open: false });

  const confirmDelete = (site: Pick<Site, 'id' | 'name'>) =>
    modals.openConfirmModal({
      title: 'Удалить объект?',
      children: (
        <Text size="sm">
          Объект «{site.name}» будет удалён. Объект с задачами удалить нельзя — сначала удалите задачи.
        </Text>
      ),
      labels: { confirm: 'Удалить', cancel: 'Отмена' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        remove.mutate(site.id, {
          onSuccess: () => notifySuccess('Объект удалён'),
          onError: (e) => notifyError(e, 'Не удалось удалить объект'),
        }),
    });

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Объекты</Title>
        {isManager && <Button onClick={() => setEdit({ open: true, site: null })}>Создать</Button>}
      </Group>

      <Paper withBorder>
        {sites.isPending ? (
          <PageLoader />
        ) : sites.isError ? (
          <ErrorState error={sites.error} />
        ) : sites.data.length === 0 ? (
          <EmptyState>{isManager ? 'Объектов пока нет' : 'Нет объектов с вашими задачами'}</EmptyState>
        ) : (
          <Table.ScrollContainer minWidth={600}>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Название</Table.Th>
                  <Table.Th>Адрес</Table.Th>
                  <Table.Th>Создан</Table.Th>
                  {isManager && <Table.Th />}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sites.data.map((s) => (
                  <Table.Tr key={s.id}>
                    <Table.Td>
                      <Anchor component={Link} to={`/sites/${s.id}`}>
                        {s.name}
                      </Anchor>
                    </Table.Td>
                    <Table.Td>{s.address}</Table.Td>
                    <Table.Td>
                      {formatDate(s.created_at)}
                      {s.author && (
                        <Text size="xs" c="dimmed">
                          {s.author.full_name}
                        </Text>
                      )}
                    </Table.Td>
                    {isManager && (
                      <Table.Td>
                        <Group gap="xs" justify="flex-end" wrap="nowrap">
                          <Button size="xs" variant="default" onClick={() => setEdit({ open: true, site: s })}>
                            Редактировать
                          </Button>
                          <Button size="xs" color="red" variant="light" onClick={() => confirmDelete(s)}>
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
        <SiteFormModal
          opened={edit.open}
          site={edit.open ? edit.site : null}
          onClose={() => setEdit({ open: false })}
        />
      )}
    </Stack>
  );
}
