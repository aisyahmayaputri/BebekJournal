export type ThemeName = 'light' | 'dark' | 'autumn' | 'babyblue';

export const THEMES: { id: ThemeName; label: Record<string, string> }[] = [
  { id: 'light', label: { en: 'Light', device: 'Light' } },
  { id: 'dark', label: { en: 'Dark', device: 'Dark' } },
  { id: 'autumn', label: { en: 'Autumn', device: 'Autumn' } },
  { id: 'babyblue', label: { en: 'Baby Blue', device: 'Baby Blue' } },
];

export interface EntryTheme {
  bgColor: string;
  textColor: string;
  outlineColor: string;
  outlineStyle: 'solid' | 'dashed' | 'hand';
  accentColor: string;
  fontFamily: string;
  fontSize: number;
  pattern: 'none' | 'dots' | 'grid' | 'lined' | 'graph';
  patternColor: string;
  layout: 'full' | 'book' | 'postcard' | 'sketchbook';
  pageRatio: '3:4' | '4:3' | '1:1' | '2:3';
}

export const DEFAULT_ENTRY_THEME: EntryTheme = {
  bgColor: '#FFFDF7',
  textColor: '#49382E',
  outlineColor: '#8B7563',
  outlineStyle: 'hand',
  accentColor: '#B99A79',
  fontFamily: "'Gaegu', cursive",
  fontSize: 16,
  pattern: 'none',
  patternColor: '#D9C9B2',
  layout: 'full',
  pageRatio: '3:4',
};
