import { Alert, Button, Center, Stack } from '@mantine/core';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { errorMessage } from '../lib/errors';
import { PageLoader } from './PageState';

export function ProtectedRoute() {
  const { session, profile, loading, profileError, signOut } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (!profile) {
    return (
      <Center h="100vh">
        <Stack>
          <Alert color="red" title="Не удалось загрузить профиль">
            {profileError ? errorMessage(profileError) : 'Профиль пользователя не найден. Обратитесь к администратору.'}
          </Alert>
          <Button variant="default" onClick={() => void signOut()}>
            Выйти
          </Button>
        </Stack>
      </Center>
    );
  }

  return <Outlet />;
}

export function HomeRedirect() {
  const { profile } = useAuth();
  return <Navigate to={profile?.role === 'executor' ? '/my-tasks' : '/sites'} replace />;
}
