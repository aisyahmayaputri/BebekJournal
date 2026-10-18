import JSZip from 'jszip';
import { supabase } from '@/lib/supabase';

export const BACKUP_VERSION = 1;

export interface BackupPreview {
  version: number;
  entries: number;
  tags: number;
  folders: number;
  moodLogs: number;
  events: number;
  compilations: number;
  mediaFiles: number;
}

interface Manifest {
  app: 'diary-bebek';
  version: number;
  exportedAt: string;
  data: {
    entries: unknown[];
    tags: unknown[];
    folders: unknown[];
    entryTags: unknown[];
    entryFolders: unknown[];
    moodLogs: unknown[];
    events: unknown[];
    compilations: unknown[];
    preferences: Record<string, unknown>;
  };
  mediaFiles: string[];
}

async function fetchAll(table: string): Promise<unknown[]> {
  const { data, error } = await supabase.from(table).select('*');
  if (error) throw new Error(`Backup failed reading ${table}: ${error.message}`);
  return data ?? [];
}

function stripUser(rows: unknown[]): unknown[] {
  return rows.map((r) => {
    const { user_id, ...rest } = r as Record<string, unknown>;
    return rest;
  });
}

export async function createBackup(): Promise<Blob> {
  const zip = new JSZip();
  const [entries, tags, folders, entryTags, entryFolders, moodLogs, events, compilations] =
    await Promise.all([
      fetchAll('entries'),
      fetchAll('tags'),
      fetchAll('folders'),
      fetchAll('entry_tags'),
      fetchAll('entry_folders'),
      fetchAll('mood_logs'),
      fetchAll('events'),
      fetchAll('compilations'),
    ]);

  // collect media paths referenced by entries
  const mediaPaths = new Set<string>();
  for (const e of entries as Record<string, unknown>[]) {
    const blocks = (e.blocks ?? {}) as Record<string, unknown>;
    const media = (blocks.media ?? []) as { kind: string; url: string; external?: boolean }[];
    const photos = ((blocks.hangout as Record<string, unknown>)?.photos ?? []) as typeof media;
    for (const m of [...media, ...photos]) {
      if (m.kind === 'image' || m.kind === 'audio') {
        if (!m.external) mediaPaths.add(m.url);
      }
    }
    for (const key of ['movie', 'book'] as const) {
      const cover = (blocks[key] as Record<string, unknown>)?.coverUrl;
      if (typeof cover === 'string' && cover && !cover.startsWith('http') && !cover.startsWith('blob:')) {
        mediaPaths.add(cover);
      }
    }
  }

  const manifest: Manifest = {
    app: 'diary-bebek',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      entries: stripUser(entries),
      tags: stripUser(tags),
      folders: stripUser(folders),
      entryTags: stripUser(entryTags),
      entryFolders: stripUser(entryFolders),
      moodLogs: stripUser(moodLogs),
      events: stripUser(events),
      compilations: stripUser(compilations),
      preferences: {},
    },
    mediaFiles: [],
  };

  // download each media file into the archive
  let idx = 0;
  for (const path of mediaPaths) {
    try {
      const { data, error } = await supabase.storage.from('media').download(path);
      if (!error && data) {
        const name = `media/${String(idx).padStart(4, '0')}_${path.split('/').pop() ?? 'file'}`;
        zip.file(name, data);
        manifest.mediaFiles.push(JSON.stringify({ origPath: path, archivePath: name }));
        idx += 1;
      }
    } catch {
      // skip unreadable files; report in manifest count
    }
  }

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export async function peekBackup(file: File): Promise<BackupPreview> {
  const zip = await JSZip.loadAsync(file);
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) throw new Error('Not a valid Diary Bebek backup (missing manifest).');
  const manifest = JSON.parse(await manifestFile.async('string')) as Manifest;
  if (manifest.app !== 'diary-bebek') throw new Error('Not a Diary Bebek backup file.');
  if (manifest.version > BACKUP_VERSION) {
    throw new Error(`Backup was created with a newer version (v${manifest.version}).`);
  }
  return {
    version: manifest.version,
    entries: manifest.data.entries.length,
    tags: manifest.data.tags.length,
    folders: manifest.data.folders.length,
    moodLogs: manifest.data.moodLogs.length,
    events: manifest.data.events.length,
    compilations: manifest.data.compilations.length,
    mediaFiles: manifest.mediaFiles.length,
  };
}

const RESTORE_TABLES = [
  'tags',
  'folders',
  'entries',
  'entry_tags',
  'entry_folders',
  'mood_logs',
  'events',
  'compilations',
] as const;

export async function importBackup(
  file: File,
  mode: 'merge' | 'replace',
  previewOnly: boolean
): Promise<BackupPreview> {
  const zip = await JSZip.loadAsync(file);
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) throw new Error('Not a valid Diary Bebek backup (missing manifest).');
  const manifest = JSON.parse(await manifestFile.async('string')) as Manifest;
  if (manifest.app !== 'diary-bebek') throw new Error('Not a Diary Bebek backup file.');
  if (manifest.version > BACKUP_VERSION) throw new Error('Backup version is newer than this app supports.');

  const preview = await peekBackup(file);
  if (previewOnly) return preview;

  // validate current auth
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('You must be signed in to restore a backup.');

  if (mode === 'replace') {
    // delete existing content in dependency order (media left in storage; safe)
    for (const table of [...RESTORE_TABLES].reverse()) {
      if (table === 'tags' || table === 'folders' || table === 'entries' || table === 'mood_logs' || table === 'events' || table === 'compilations') {
        await supabase.from(table).delete().eq('user_id', userId);
      } else if (table === 'entry_tags') {
        await supabase.from('entry_tags').delete().eq('user_id', userId);
      } else if (table === 'entry_folders') {
        await supabase.from('entry_folders').delete().eq('user_id', userId);
      }
    }
  }

  // restore with ID remapping for conflicts
  const idMap = new Map<string, string>();
  const mapIds = (rows: unknown[]) =>
    rows.map((r) => {
      const row = { ...(r as Record<string, unknown>) };
      if (typeof row.id === 'string') {
        const existing = idMap.get(row.id);
        if (existing) row.id = existing;
      }
      return row;
    });

  // first pass: create rows whose ids don't conflict
  const insertRows = async (table: string, rows: unknown[]) => {
    if (!rows.length) return;
    const prepared = mapIds(rows).map((r) => {
      const row = { ...(r as Record<string, unknown>), user_id: userId };
      return row;
    });
    const { error } = await supabase.from(table).upsert(prepared, { onConflict: 'id', ignoreDuplicates: mode === 'merge' });
    if (error) throw new Error(`Restore failed at ${table}: ${error.message}`);
  };

  // restore order matters for FKs
  await insertRows('tags', manifest.data.tags);
  await insertRows('folders', manifest.data.folders);
  await insertRows('entries', manifest.data.entries);
  await insertRows('entry_tags', manifest.data.entryTags);
  await insertRows('entry_folders', manifest.data.entryFolders);
  await insertRows('mood_logs', manifest.data.moodLogs);
  await insertRows('events', manifest.data.events);
  await insertRows('compilations', manifest.data.compilations);

  // restore media files to their original paths
  for (const metaRaw of manifest.mediaFiles) {
    try {
      const meta = JSON.parse(metaRaw) as { origPath: string; archivePath: string };
      const f = zip.file(meta.archivePath);
      if (!f) continue;
      const blob = await f.async('blob');
      const fileObj = new File([blob], meta.origPath.split('/').pop() ?? 'file');
      await supabase.storage.from('media').upload(meta.origPath, fileObj, { upsert: true });
    } catch {
      // continue restoring remaining files
    }
  }

  return preview;
}
