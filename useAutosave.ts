import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Entry } from '@/lib/types';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function useAutosave(entryId: string | null, delay = 1200) {
  const [state, setState] = useState<SaveState>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Partial<Entry> | null>(null);
  const saving = useRef(false);

  const flush = useCallback(async () => {
    if (!entryId || !pending.current || saving.current) return;
    saving.current = true;
    setState('saving');
    const patch = pending.current;
    pending.current = null;
    const { error } = await supabase.from('entries').update(patch).eq('id', entryId);
    saving.current = false;
    if (error) {
      // restore pending so it can be retried
      pending.current = patch;
      setState('error');
      setLastError(error.message);
    } else {
      setState('saved');
      setLastError(null);
      if (pending.current) {
        // more changes arrived while saving — go again
        flush();
      }
    }
  }, [entryId]);

  const queue = useCallback(
    (patch: Partial<Entry>) => {
      if (!entryId) return;
      pending.current = { ...pending.current, ...patch };
      setState('saving');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [entryId, delay, flush]
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // attempt to save pending changes when leaving the page
  useEffect(() => {
    const handler = () => {
      if (pending.current) {
        void supabase.from('entries').update(pending.current).eq('id', entryId ?? '');
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [entryId]);

  const flushNow = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await flush();
  }, [flush]);

  return { state, queue, flushNow, lastError };
}
