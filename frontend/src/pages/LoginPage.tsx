import { useState } from 'react';
import { Alert, Button, Center, Paper, PasswordInput, Stack, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { Navigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { PageLoader } from '../components/PageState';
import { errorMessage } from '../lib/errors';

export function LoginPage() {
  const { session, loading, signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (v) => (/^\S+@\S+$/.test(v) ? null : 'Введите email'),
      password: (v) => (v ? null : 'Введите пароль'),
    },
  });

  if (loading) return <PageLoader />;
  if (session) return <Navigate to="/" replace />;

  const submit = form.onSubmit(async ({ email, password }) => {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Center mih="100vh" p="md">
      <Paper withBorder p="xl" radius="md" w="100%" maw={380}>
        <form onSubmit={submit}>
          <Stack>
            <Title order={3}>Вход</Title>
            {error && <Alert color="red">{error}</Alert>}
            <TextInput label="Email" autoComplete="email" {...form.getInputProps('email')} />
            <PasswordInput label="Пароль" autoComplete="current-password" {...form.getInputProps('password')} />
            <Button type="submit" loading={submitting}>
              Войти
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
