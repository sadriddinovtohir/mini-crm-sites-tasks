import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { TaskStatus } from '../types';

const TASK_LIST_SELECT =
  'id, title, description, status, site_id, assignee_id, created_at, updated_at, assignee:profiles!tasks_assignee_id_fkey(id, full_name), site:sites(id, name)';

const TASK_FULL_SELECT =
  '*, assignee:profiles!tasks_assignee_id_fkey(id, full_name), author:profiles!tasks_created_by_fkey(id, full_name), site:sites(id, name, address)';

export function useSiteTasks(siteId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', 'site', siteId],
    enabled: Boolean(siteId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(TASK_LIST_SELECT)
        .eq('site_id', siteId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useMyTasks(userId: string | undefined, status: TaskStatus | null) {
  return useQuery({
    queryKey: ['tasks', 'my', userId, status],
    enabled: Boolean(userId),
    queryFn: async () => {
      let query = supabase.from('tasks').select(TASK_LIST_SELECT).eq('assignee_id', userId!);
      if (status) query = query.eq('status', status);
      const { data, error } = await query.order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ['tasks', 'one', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select(TASK_FULL_SELECT).eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useTaskHistory(taskId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', 'history', taskId],
    enabled: Boolean(taskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_status_history')
        .select('*, changer:profiles!task_status_history_changed_by_fkey(id, full_name)')
        .eq('task_id', taskId!)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useExecutors() {
  return useQuery({
    queryKey: ['profiles', 'executors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'executor')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });
}

export type TaskInput = {
  site_id: string;
  title: string;
  description: string | null;
  assignee_id: string;
};

export function useSaveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: TaskInput }) => {
      const query = id
        ? supabase.from('tasks').update(input).eq('id', id).select().single()
        : supabase.from('tasks').insert(input).select().single();
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['sites'] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('tasks').delete().eq('id', id).select('id');
      if (error) throw error;
      if (!data.length) throw new Error('Задача не найдена или нет прав на удаление');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['sites'] });
    },
  });
}

export function useChangeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { taskId: string; to: TaskStatus; comment: string | null }) => {
      const { data, error } = await supabase.rpc('change_task_status', {
        p_task_id: args.taskId,
        p_to: args.to,
        p_comment: args.comment,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
