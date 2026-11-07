import type { Enums, Tables } from './database';

export type UserRole = Enums<'user_role'>;
export type TaskStatus = Enums<'task_status'>;

export type Profile = Tables<'profiles'>;
export type Site = Tables<'sites'>;
export type Task = Tables<'tasks'>;
export type TaskHistoryRow = Tables<'task_status_history'>;

export type PersonRef = Pick<Profile, 'id' | 'full_name'>;
