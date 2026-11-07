import { Anchor, Stack, Title } from '@mantine/core';
import { Link, Route, Routes } from 'react-router';
import { AppLayout } from './components/AppLayout';
import { HomeRedirect, ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { MyTasksPage } from './pages/MyTasksPage';
import { SitePage } from './pages/SitePage';
import { SitesPage } from './pages/SitesPage';
import { TaskPage } from './pages/TaskPage';

function NotFound() {
  return (
    <Stack align="center" py="xl">
      <Title order={3}>Страница не найдена</Title>
      <Anchor component={Link} to="/">
        На главную
      </Anchor>
    </Stack>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<HomeRedirect />} />
          <Route path="/sites" element={<SitesPage />} />
          <Route path="/sites/:id" element={<SitePage />} />
          <Route path="/tasks/:id" element={<TaskPage />} />
          <Route path="/my-tasks" element={<MyTasksPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
