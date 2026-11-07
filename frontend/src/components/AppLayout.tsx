import { Anchor, AppShell, Badge, Button, Container, Group, Text } from '@mantine/core';
import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { ROLE_LABELS } from '../lib/statuses';

export function AppLayout() {
  const { profile, signOut } = useAuth();

  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header>
        <Container size="lg" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Group gap="lg" wrap="nowrap">
              <Text fw={700}>Объекты и задачи</Text>
              <Anchor component={NavLink} to="/sites">
                Объекты
              </Anchor>
              {profile?.role === 'executor' && (
                <Anchor component={NavLink} to="/my-tasks">
                  Мои задачи
                </Anchor>
              )}
            </Group>
            <Group gap="sm" wrap="nowrap">
              <Text size="sm">{profile?.full_name}</Text>
              {profile && (
                <Badge variant="light" color={profile.role === 'manager' ? 'grape' : 'blue'}>
                  {ROLE_LABELS[profile.role]}
                </Badge>
              )}
              <Button variant="default" size="xs" onClick={() => void signOut()}>
                Выйти
              </Button>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>
      <AppShell.Main>
        <Container size="lg">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
