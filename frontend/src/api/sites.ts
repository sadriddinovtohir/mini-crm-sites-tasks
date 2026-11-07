import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const SITE_SELECT = 'id, name, address, created_at, created_by, author:profiles!sites_created_by_fkey(id, full_name)';

export function useSites() {
  return useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sites').select(SITE_SELECT).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSite(id: string | undefined) {
  return useQuery({
    queryKey: ['sites', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('sites').select(SITE_SELECT).eq('id', id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export type SiteInput = { name: string; address: string };

export function useSaveSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: SiteInput }) => {
      const query = id
        ? supabase.from('sites').update(input).eq('id', id).select().single()
        : supabase.from('sites').insert(input).select().single();
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  });
}

export function useDeleteSite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('sites').delete().eq('id', id).select('id');
      if (error) throw error;
      if (!data.length) throw new Error('Объект не найден или нет прав на удаление');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sites'] }),
  });
}
