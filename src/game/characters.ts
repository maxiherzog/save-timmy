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
    color: '#99f6e4', // pastel teal
    accent: '#0f766e',
    initials: 'TB',
    quote: 'Ich war auch kurz davor, ins Wasser zu springen.',
  },
  {
    id: 'bohnsack',
    name: 'Felix Bohnsack',
    title: 'Das Wunderkind',
    color: '#fef08a', // pastel yellow
    accent: '#ca8a04',
    initials: 'FB',
    quote: 'Es ist ein ganzer Hinkelstein, der mir vom Herzen fällt.',
  },
  {
    id: 'toennies',
    name: 'Kirsten Tönnies',
    title: 'Die ehrliche Tierärztin',
    color: '#fecdd3', // pastel rose
    accent: '#be123c',
    initials: 'KT',
    quote: 'Der Wal braucht mehr als schöne Worte.',
  },
  {
    id: 'babbel',
    name: 'Fred Babbel',
    title: 'Der raue Taucher',
    color: '#bfdbfe', // pastel blue
    accent: '#1e40af',
    initials: 'FB',
    quote: 'Der Wal will leben.',
  },
  {
    id: 'gunz',
    name: 'Walter Gunz',
    title: 'Der Sponsor',
    color: '#fed7aa', // pastel orange
    accent: '#b45309',
    initials: 'WG',
    quote: 'Ich habe noch nie in meinem Leben so viel gebetet.',
  },
  {
    id: 'lehmann',
    name: 'Robert M. Lehmann',
    title: 'Der Walflüsterer',
    color: '#bbf7d0', // pastel green
    accent: '#15803d',
    initials: 'RL',
    quote: 'Die Wahrheit über Wal Timmy.',
  },
  {
    id: 'gross',
    name: 'Stephanie Groß',
    title: 'Die Wissenschaftlerin',
    color: '#bae6fd', // pastel light blue
    accent: '#0369a1',
    initials: 'SG',
    quote: 'Wir sollten dem Tier nicht weiter schaden.',
  },
  {
    id: 'partheil',
    name: 'Sven Partheil-Böhnke',
    title: 'Der Bürgermeister',
    color: '#ffedd5', // pastel light orange
    accent: '#ea580c',
    initials: 'SP',
    quote: 'Ich habe das nicht verschlafen.',
  },
  {
    id: 'hilse',
    name: 'Danny First Class',
    title: 'Der Mann im Hintergrund',
    color: '#e5e7eb', // pastel grey
    accent: '#4b5563',
    initials: 'DH',
    quote: 'Ich war dabei!',
  },
];

export function characterById(id: CharacterId): Character {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
