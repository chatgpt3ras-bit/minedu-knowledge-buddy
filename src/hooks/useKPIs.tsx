import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

export interface KPIData {
  fecha: string;
  avg_latency_ms: number;
  precision_at_k_avg: number;
  reuse_rate: number;
  docs_nuevos: number;
  consultas: number;
}

export function useKPIs(days: number = 30) {
  return useQuery({
    queryKey: ['kpis', days],
    queryFn: async () => {
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('kpis_daily')
        .select('*')
        .gte('fecha', startDate)
        .order('fecha', { ascending: true });

      if (error) throw error;
      return data as KPIData[];
    },
  });
}

export function useLatestKPIs() {
  return useQuery({
    queryKey: ['latest-kpis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpis_daily')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // If no data exists, return zeros
        if (error.code === 'PGRST116') {
          return {
            avg_latency_ms: 0,
            precision_at_k_avg: 0,
            reuse_rate: 0,
            docs_nuevos: 0,
            consultas: 0,
          };
        }
        throw error;
      }
      
      return data as KPIData;
    },
  });
}
