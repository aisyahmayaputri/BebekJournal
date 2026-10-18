import { supabase } from '@/lib/supabase';
import type {
  Entry,
  EntryType,
  Tag,
  Folder,
  MoodDef,
  MoodLog,
  CalEvent,
  Compilation,
  EntryBlocks,
} from '@/lib/types';

export interface EntryFilters {
  types?: EntryType[];
  tagIds?: string[];
  folderId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  pinnedHome?: boolean;
}

export const dataApi = {
  // ---------- entries ----------
  async listEntries(filters: EntryFilters = {}): Promise<Entry[]> {
    let q = supabase.from('entries').select('*').order('date', { ascending: false });
    if (filters.types?.length) q = q.in('type', filters.types);
    if (filters.dateFrom) q = q.gte('date', filters.dateFrom);
    if (filters.dateTo) q = q.lte('date', filters.dateTo);
    if (filters.pinnedHome) q = q.eq('pinned_home', true);
    if (filters.search) q = q.ilike('title', `%${filters.search}%`);
    if (filters.folderId) {
      const { data: links, error } = await supabase
        .from('entry_folders')
        .select('entry_id')
        .eq('folder_id', filters.folderId);
      if (error) throw error;
      const ids = (links ?? []).map((l) => l.entry_id);
      if (!ids.length) return [];
      q = q.in('id', ids);
    }
    if (filters.tagIds?.length) {
      const { data: links, error } = await supabase
        .from('entry_tags')
        .select('entry_id')
        .in('tag_id', filters.tagIds);
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const l of links ?? []) counts.set(l.entry_id, (counts.get(l.entry_id) ?? 0) + 1);
      const ids = [...counts.entries()]
        .filter(([, c]) => c === filters.tagIds!.length)
        .map(([id]) => id);
      if (!ids.length) return [];
      q = q.in('id', ids);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Entry[];
  },

  async getEntry(id: string): Promise<Entry | null> {
    const { data, error } = await supabase.from('entries').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as Entry) ?? null;
  },

  async createEntry(partial: {
    type: EntryType;
    title?: string;
    date?: string;
    content?: string;
    blocks?: EntryBlocks;
  }): Promise<Entry> {
    const { data, error } = await supabase
      .from('entries')
      .insert({
        type: partial.type,
        title: partial.title ?? '',
        // local date (not UTC) so the entry belongs to the user's calendar day
        date: partial.date ?? new Date().toLocaleDateString('en-CA'),
        content: partial.content ?? '',
        blocks: partial.blocks ?? {},
      })
      .select()
      .single();
    if (error) throw error;
    return data as Entry;
  },

  async updateEntry(id: string, patch: Partial<Entry>): Promise<void> {
    const { error } = await supabase.from('entries').update(patch).eq('id', id);
    if (error) throw error;
  },

  async deleteEntry(id: string): Promise<void> {
    const { error } = await supabase.from('entries').delete().eq('id', id);
    if (error) throw error;
  },

  async setEntryTags(entryId: string, tagIds: string[]): Promise<void> {
    const { data: existing, error: e1 } = await supabase
      .from('entry_tags')
      .select('tag_id')
      .eq('entry_id', entryId);
    if (e1) throw e1;
    const existingIds = new Set((existing ?? []).map((r) => r.tag_id));
    const toAdd = tagIds.filter((t) => !existingIds.has(t));
    const toRemove = [...existingIds].filter((t) => !tagIds.includes(t));
    if (toAdd.length) {
      const { error } = await supabase
        .from('entry_tags')
        .insert(toAdd.map((tag_id) => ({ entry_id: entryId, tag_id })));
      if (error) throw error;
    }
    if (toRemove.length) {
      const { error } = await supabase
        .from('entry_tags')
        .delete()
        .eq('entry_id', entryId)
        .in('tag_id', toRemove);
      if (error) throw error;
    }
  },

  async getEntryTagIds(entryId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('entry_tags')
      .select('tag_id')
      .eq('entry_id', entryId);
    if (error) throw error;
    return (data ?? []).map((r) => r.tag_id);
  },

  async setEntryFolders(entryId: string, folderIds: string[]): Promise<void> {
    const { data: existing, error: e1 } = await supabase
      .from('entry_folders')
      .select('folder_id')
      .eq('entry_id', entryId);
    if (e1) throw e1;
    const existingIds = new Set((existing ?? []).map((r) => r.folder_id));
    const toAdd = folderIds.filter((f) => !existingIds.has(f));
    const toRemove = [...existingIds].filter((f) => !folderIds.includes(f));
    if (toAdd.length) {
      const { error } = await supabase
        .from('entry_folders')
        .insert(toAdd.map((folder_id) => ({ entry_id: entryId, folder_id })));
      if (error) throw error;
    }
    if (toRemove.length) {
      const { error } = await supabase
        .from('entry_folders')
        .delete()
        .eq('entry_id', entryId)
        .in('folder_id', toRemove);
      if (error) throw error;
    }
  },

  async getEntryFolderIds(entryId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('entry_folders')
      .select('folder_id')
      .eq('entry_id', entryId);
    if (error) throw error;
    return (data ?? []).map((r) => r.folder_id);
  },

  async listEntryTags(): Promise<{ entry_id: string; tag_id: string }[]> {
    const { data, error } = await supabase.from('entry_tags').select('entry_id, tag_id');
    if (error) throw error;
    return data ?? [];
  },

  async listEntryFolders(): Promise<{ entry_id: string; folder_id: string }[]> {
    const { data, error } = await supabase.from('entry_folders').select('entry_id, folder_id');
    if (error) throw error;
    return data ?? [];
  },

  // ---------- tags ----------
  async listTags(): Promise<Tag[]> {
    const { data, error } = await supabase.from('tags').select('*').order('name');
    if (error) throw error;
    return (data ?? []) as Tag[];
  },

  async createTag(name: string, chip_bg?: string, chip_text?: string): Promise<Tag> {
    const { data, error } = await supabase
      .from('tags')
      .insert({ name, ...(chip_bg ? { chip_bg } : {}), ...(chip_text ? { chip_text } : {}) })
      .select()
      .single();
    if (error) throw error;
    return data as Tag;
  },

  async updateTag(id: string, patch: Partial<Tag>): Promise<void> {
    const { error } = await supabase.from('tags').update(patch).eq('id', id);
    if (error) throw error;
  },

  async deleteTag(id: string): Promise<void> {
    const { error } = await supabase.from('tags').delete().eq('id', id);
    if (error) throw error;
  },

  // ---------- folders ----------
  async listFolders(): Promise<Folder[]> {
    const { data, error } = await supabase.from('folders').select('*').order('name');
    if (error) throw error;
    return (data ?? []) as Folder[];
  },

  async createFolder(p: Partial<Folder> & { name: string }): Promise<Folder> {
    const { data, error } = await supabase.from('folders').insert(p).select().single();
    if (error) throw error;
    return data as Folder;
  },

  async updateFolder(id: string, patch: Partial<Folder>): Promise<void> {
    const { error } = await supabase.from('folders').update(patch).eq('id', id);
    if (error) throw error;
  },

  async deleteFolder(id: string): Promise<void> {
    const { error } = await supabase.from('folders').delete().eq('id', id);
    if (error) throw error;
  },

  // ---------- moods ----------
  async listMoods(): Promise<MoodDef[]> {
    const { data, error } = await supabase
      .from('moods')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    return (data ?? []) as MoodDef[];
  },

  async createMood(label: string, color: string): Promise<MoodDef> {
    const { data, error } = await supabase
      .from('moods')
      .insert({ label, color, is_builtin: false })
      .select()
      .single();
    if (error) throw error;
    return data as MoodDef;
  },

  async updateMood(id: string, patch: Partial<MoodDef>): Promise<void> {
    const { error } = await supabase.from('moods').update(patch).eq('id', id);
    if (error) throw error;
  },

  async deleteMood(id: string): Promise<void> {
    const { error } = await supabase.from('moods').delete().eq('id', id);
    if (error) throw error;
  },

  async listMoodLogs(from?: string, to?: string): Promise<MoodLog[]> {
    let q = supabase.from('mood_logs').select('*').order('date', { ascending: false });
    if (from) q = q.gte('date', from);
    if (to) q = q.lte('date', to);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as MoodLog[];
  },

  async upsertMoodLog(date: string, moods: MoodLog['moods']): Promise<void> {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) throw new Error('Not signed in');
    const { data: existing } = await supabase
      .from('mood_logs')
      .select('id')
      .eq('date', date)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase.from('mood_logs').update({ moods }).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('mood_logs').insert({ date, moods });
      if (error) throw error;
    }
  },

  // ---------- events ----------
  async listEvents(from?: string, to?: string): Promise<CalEvent[]> {
    let q = supabase.from('events').select('*').order('date');
    if (from) q = q.gte('date', from);
    if (to) q = q.lte('date', to);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as CalEvent[];
  },

  async createEvent(p: Partial<CalEvent> & { name: string; date: string }): Promise<CalEvent> {
    const { data, error } = await supabase.from('events').insert(p).select().single();
    if (error) throw error;
    return data as CalEvent;
  },

  async updateEvent(id: string, patch: Partial<CalEvent>): Promise<void> {
    const { error } = await supabase.from('events').update(patch).eq('id', id);
    if (error) throw error;
  },

  async deleteEvent(id: string): Promise<void> {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
  },

  // ---------- compilations ----------
  async listCompilations(): Promise<Compilation[]> {
    const { data, error } = await supabase
      .from('compilations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Compilation[];
  },

  async createCompilation(p: {
    title: string;
    theme?: Compilation['theme'];
    source_ids: string[];
    snapshot: { entries: Entry[] };
    cover_url?: string;
  }): Promise<Compilation> {
    const { data, error } = await supabase.from('compilations').insert(p).select().single();
    if (error) throw error;
    return data as Compilation;
  },

  async updateCompilation(id: string, patch: Partial<Compilation>): Promise<void> {
    const { error } = await supabase.from('compilations').update(patch).eq('id', id);
    if (error) throw error;
  },

  async deleteCompilation(id: string): Promise<void> {
    const { error } = await supabase.from('compilations').delete().eq('id', id);
    if (error) throw error;
  },

  // ---------- media ----------
  async uploadMedia(file: File, entryId: string): Promise<{ path: string }> {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) throw new Error('Not signed in');
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${userId}/${entryId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from('media')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    return { path };
  },

  async createSignedUrl(path: string, ttl = 3600): Promise<string> {
    const { data, error } = await supabase.storage.from('media').createSignedUrl(path, ttl);
    if (error) throw error;
    return data.signedUrl;
  },

  async deleteMedia(path: string): Promise<void> {
    const { error } = await supabase.storage.from('media').remove([path]);
    if (error) throw error;
  },
};
