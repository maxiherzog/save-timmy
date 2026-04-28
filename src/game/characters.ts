export type CharacterId =
  | 'backhaus'
  | 'bohnsack'
  | 'toennies'
  | 'babbel'
  | 'gunz'
  | 'lehmann'
  | 'gross'
  | 'partheil'
  | 'hilse';

export type Character = {
  id: CharacterId;
  name: string;
  title: string;
  color: string;
  accent: string;
  initials: string;
  quote: string;
};

export const CHARACTERS: Character[] = [
  {
    id: 'backhaus',
    name: 'Till Backhaus',
    title: 'Der Tränen-Minister',
    color: '#0f766e',
    accent: '#14b8a6',
    initials: 'TB',
    quote: 'Ich war auch kurz davor, ins Wasser zu springen.',
  },
  {
    id: 'bohnsack',
    name: 'Felix Bohnsack',
    title: 'Das Wunderkind',
    color: '#ca8a04',
    accent: '#eab308',
    initials: 'FB',
    quote: 'Es ist ein ganzer Hinkelstein, der mir vom Herzen fällt.',
  },
  {
    id: 'toennies',
    name: 'Kirsten Tönnies',
    title: 'Die ehrliche Tierärztin',
    color: '#be123c',
    accent: '#f43f5e',
    initials: 'KT',
    quote: 'Der Wal braucht mehr als schöne Worte.',
  },
  {
    id: 'babbel',
    name: 'Fred Babbel',
    title: 'Der raue Taucher',
    color: '#1e40af',
    accent: '#3b82f6',
    initials: 'FB',
    quote: 'Der Wal will leben.',
  },
  {
    id: 'gunz',
    name: 'Walter Gunz',
    title: 'Der Sponsor',
    color: '#b45309',
    accent: '#f59e0b',
    initials: 'WG',
    quote: 'Ich habe noch nie in meinem Leben so viel gebetet.',
  },
  {
    id: 'lehmann',
    name: 'Robert M. Lehmann',
    title: 'Der Walflüsterer',
    color: '#15803d',
    accent: '#22c55e',
    initials: 'RL',
    quote: 'Die Wahrheit über Wal Timmy.',
  },
  {
    id: 'gross',
    name: 'Stephanie Groß',
    title: 'Die Wissenschaftlerin',
    color: '#0369a1',
    accent: '#0ea5e9',
    initials: 'SG',
    quote: 'Wir sollten dem Tier nicht weiter schaden.',
  },
  {
    id: 'partheil',
    name: 'Sven Partheil-Böhnke',
    title: 'Der Bürgermeister',
    color: '#ea580c',
    accent: '#fb923c',
    initials: 'SP',
    quote: 'Ich habe das nicht verschlafen.',
  },
  {
    id: 'hilse',
    name: 'Danny First Class',
    title: 'Der Mann im Hintergrund',
    color: '#7c2d12',
    accent: '#c2410c',
    initials: 'DH',
    quote: 'Ich war dabei!',
  },
];

export function characterById(id: CharacterId): Character {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
