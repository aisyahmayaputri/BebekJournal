export interface FontOption {
  id: string;
  name: string;
  stack: string;
  category: 'hand' | 'serif' | 'sans' | 'round' | 'mono';
}

// Curated collection loaded from Google Fonts in index.html.
export const APP_FONTS: FontOption[] = [
  { id: 'gaegu', name: 'Gaegu', stack: "'Gaegu', cursive", category: 'hand' },
  { id: 'patrick', name: 'Patrick Hand', stack: "'Patrick Hand', cursive", category: 'hand' },
  { id: 'caveat', name: 'Caveat', stack: "'Caveat', cursive", category: 'hand' },
  { id: 'nunito', name: 'Nunito', stack: "'Nunito', sans-serif", category: 'round' },
  { id: 'quicksand', name: 'Quicksand', stack: "'Quicksand', sans-serif", category: 'round' },
  { id: 'lora', name: 'Lora', stack: "'Lora', serif", category: 'serif' },
  { id: 'merriweather', name: 'Merriweather', stack: "'Merriweather', serif", category: 'serif' },
  { id: 'inter', name: 'Inter', stack: "'Inter', system-ui, sans-serif", category: 'sans' },
  { id: 'lexend', name: 'Lexend', stack: "'Lexend', sans-serif", category: 'sans' },
  { id: 'jetbrains', name: 'JetBrains Mono', stack: "'JetBrains Mono', monospace", category: 'mono' },
];

export const ENTRY_FONTS: FontOption[] = [
  ...APP_FONTS,
  { id: 'indie', name: 'Indie Flower', stack: "'Indie Flower', cursive", category: 'hand' },
  { id: 'shadows', name: 'Shadows Into Light', stack: "'Shadows Into Light', cursive", category: 'hand' },
  { id: 'crayon', name: 'Crayon Crumble', stack: "'Comic Neue', cursive", category: 'hand' },
];

export const ALL_FONT_STACKS = Array.from(
  new Set([...APP_FONTS, ...ENTRY_FONTS].map((f) => f.stack)),
);

export function fontStackFor(id: string): string {
  const f = [...APP_FONTS, ...ENTRY_FONTS].find((x) => x.id === id);
  return f ? f.stack : "'Gaegu', cursive";
}
