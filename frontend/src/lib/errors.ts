import { notifications } from '@mantine/notifications';

type ErrorLike = { message?: string; code?: string; details?: string };

const HAS_CYRILLIC = /[а-яё]/i;

export function errorMessage(error: unknown): string {
  const e = (error ?? {}) as ErrorLike;
  const message = e.message ?? '';

  if (HAS_CYRILLIC.test(message)) return message;

  switch (e.code) {
    case '42501':
      return 'Недостаточно прав для этого действия';
    case '23001':
    case '23503':
      return 'Нельзя удалить: есть связанные записи (например, у объекта есть задачи)';
    case '23514':
      return 'Данные не прошли проверку: заполните обязательные поля';
    case 'PGRST116':
      return 'Запись не найдена или нет доступа';
    case 'invalid_credentials':
      return 'Неверный email или пароль';
  }
  if (message === 'Invalid login credentials') return 'Неверный email или пароль';
  if (message.includes('Failed to fetch')) return 'Нет связи с сервером';
  return message || 'Неизвестная ошибка';
}

export function notifyError(error: unknown, title = 'Ошибка'): void {
  notifications.show({ color: 'red', title, message: errorMessage(error) });
}

export function notifySuccess(message: string): void {
  notifications.show({ color: 'green', message });
}
