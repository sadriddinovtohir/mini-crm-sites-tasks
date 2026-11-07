import { Alert, Center, Loader, Text } from '@mantine/core';
import { errorMessage } from '../lib/errors';

export function PageLoader() {
  return (
    <Center py="xl" mih={200}>
      <Loader />
    </Center>
  );
}

export function EmptyState({ children }: { children: string }) {
  return (
    <Text c="dimmed" ta="center" py="xl">
      {children}
    </Text>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  return (
    <Alert color="red" title="Ошибка загрузки">
      {errorMessage(error)}
    </Alert>
  );
}
