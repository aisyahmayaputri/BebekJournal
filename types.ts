export type EntryType = 'diary' | 'movie' | 'book' | 'hangout';

export interface MoodRef {
  moodId: string;
  label: string;
  color: string;
  intensity: number; // 1..10
  x?: number;
  y?: number;
  scale?: number;
}

export interface DrawingLayer {
  id: string;
  strokes: DrawingStroke[];
  visible: boolean;
  opacity: number;
  order: number;
}

export interface DrawingStroke {
  id: string;
  tool: 'pen' | 'pencil' | 'highlighter' | 'brush' | 'neon' | 'eraser' | 'line' | 'circle' | 'rect' | 'arrow';
  color: string;
  width: number;
  opacity: number;
  points: number[]; // flat [x1,y1,x2,y2,...]
}

export interface MediaItem {
  id: string;
  kind: 'image' | 'audio';
  url: string; // storage path or external URL
  external?: boolean;
  caption?: string;
  transform?: {
    rotation?: number;
    scale?: number;
    opacity?: number;
    locked?: boolean;
    x?: number;
    y?: number;
    crop?: { x: number; y: number; w: number; h: number; ratio?: string };
  };
}

export interface RatingConfig {
  value: number; // 0..max
  max: number;
  icon: 'star' | 'heart' | 'duck';
  color: string;
  size: number;
  x?: number;
  y?: number;
}

export interface MovieBlocks {
  movieTitle?: string;
  coverUrl?: string;
  rating?: number;
  comment?: string;
  rewatched?: boolean;
  rewatchCount?: number;
  watchDate?: string;
  genre?: string;
}

export interface BookBlocks {
  bookTitle?: string;
  author?: string;
  coverUrl?: string;
  rating?: number;
  recommended?: boolean;
  readingDate?: string;
  quotes?: { text: string; page?: number; name?: string }[];
}

export interface HangoutAspect {
  id: string;
  tag: string;
  score: number | null;
}
export interface HangoutBlocks {
  photos?: MediaItem[];
  placeName?: string;
  placeRating?: number;
  description?: string;
  visitDate?: string;
  location?: string;
  withWho?: string;
  favThing?: string;
  aspects?: HangoutAspect[];
}

export interface EntryBlocks {
  theme?: EntryThemeLike;
  rating?: RatingConfig;
  mood?: MoodRef[];
  movie?: MovieBlocks;
  book?: BookBlocks;
  hangout?: HangoutBlocks;
  drawing?: DrawingLayer[];
  media?: MediaItem[];
  pinnedHome?: boolean;
  pinnedFolder?: boolean;
}

export interface EntryThemeLike {
  bgColor?: string;
  textColor?: string;
  outlineColor?: string;
  outlineStyle?: 'solid' | 'dashed' | 'hand';
  accentColor?: string;
  fontFamily?: string;
  fontSize?: number;
  pattern?: 'none' | 'dots' | 'grid' | 'lined' | 'graph';
  patternColor?: string;
  layout?: 'full' | 'book' | 'postcard' | 'sketchbook';
  pageRatio?: '3:4' | '4:3' | '1:1' | '2:3';
}

export interface Entry {
  id: string;
  user_id: string;
  type: EntryType;
  title: string;
  date: string; // YYYY-MM-DD, original entry date
  content: string; // rich text HTML
  blocks: EntryBlocks;
  pinned_home: boolean;
  pinned_folder: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  chip_bg: string;
  chip_text: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  cover_url: string | null;
}

export interface MoodDef {
  id: string;
  label: string;
  color: string;
  icon_name: string;
  sort_order: number;
  is_builtin: boolean;
}

export interface MoodLog {
  id: string;
  user_id: string;
  date: string;
  moods: MoodRef[];
}

export interface CalEvent {
  id: string;
  name: string;
  date: string;
  description: string;
  color: string;
  is_recurring: boolean;
  recurrence: { frequency: 'weekly' | 'monthly' | 'yearly'; interval: number; end_date?: string } | null;
}

export interface Compilation {
  id: string;
  user_id: string;
  title: string;
  cover_url: string | null;
  theme: EntryThemeLike | null;
  source_ids: string[];
  snapshot: { entries: Entry[] };
  created_at: string;
}

export const MOOD_COLORS: Record<string, string> = {
  Happy: '#E8B94A',
  Calm: '#7FB284',
  Excited: '#E58F4A',
  Grateful: '#D98FA6',
  Loved: '#D96C7B',
  Hopeful: '#6FA6C9',
  Content: '#8BA86F',
  Nostalgic: '#A98BC0',
  Anxious: '#C9A64A',
  Sad: '#6C8FB0',
  Angry: '#C05B4D',
  Frustrated: '#B0764F',
  Lonely: '#8A94A6',
  Tired: '#9C8E7E',
  Overwhelmed: '#A66B8A',
};

export const MOOD_ICONS: Record<string, string> = {
  Happy: 'smile',
  Calm: 'coffee',
  Excited: 'party-popper',
  Grateful: 'heart',
  Loved: 'heart-handshake',
  Hopeful: 'sun',
  Content: 'flower',
  Nostalgic: 'camera',
  Anxious: 'cloud-rain',
  Sad: 'cloud',
  Angry: 'flame',
  Frustrated: 'zap',
  Lonely: 'moon',
  Tired: 'battery-low',
  Overwhelmed: 'waves',
};
