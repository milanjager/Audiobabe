export interface Release {
  id: string;
  title: string;
  artist: string;
  tagline: string;
  price: number;
  originalPrice?: number;
  badge?: 'new' | 'sale' | 'ltd';
  artClass: string;
  description: string;
  tracks: number;
  bpm: string;
  format: string;
}

export interface Testimonial {
  name: string;
  role: string;
  quote: string;
  initials: string;
  color: string;
}

export interface PressItem {
  outlet: string;
  award: string;
  year: number;
}

export const releases: Release[] = [
  {
    id: '1',
    title: 'ALL RELEASES',
    artist: 'Tekno Babe',
    tagline: 'Full Catalog Access',
    price: 9.99,
    artClass: 'artwork-gradient-1',
    description: 'Unlimited access to every release in the Tekno Babe catalog — past, present, and future.',
    tracks: 200,
    bpm: 'all',
    format: 'WAV + MP3',
    badge: undefined,
  },
  {
    id: '2',
    title: 'VOID PROTOCOL',
    artist: 'Ancient Methods',
    tagline: 'Industrial Tekno EP',
    price: 7.99,
    artClass: 'artwork-gradient-2',
    description: 'Six tracks of crushing industrial darkness. Sub frequencies and machine noise collide in this landmark EP.',
    tracks: 6,
    bpm: '145–150',
    format: 'WAV',
    badge: 'new',
  },
  {
    id: '3',
    title: 'RAW VOLTAGE',
    artist: 'SPFDJ',
    tagline: 'Hard Tekno Single',
    price: 2.99,
    originalPrice: 4.99,
    artClass: 'artwork-gradient-3',
    description: 'Relentless hard tekno at 152 BPM. Designed for peak hour destruction.',
    tracks: 2,
    bpm: '152',
    format: 'WAV',
    badge: 'sale',
  },
  {
    id: '4',
    title: 'FERRIC',
    artist: 'Surgeon',
    tagline: 'Tekno Full Album',
    price: 12.99,
    originalPrice: 18.99,
    artClass: 'artwork-gradient-4',
    description: 'Surgeon\'s most direct album — 10 relentless tracks of Birmingham steel and acid.',
    tracks: 10,
    bpm: '140–148',
    format: 'WAV + FLAC',
    badge: 'sale',
  },
  {
    id: '5',
    title: 'CHLORINE',
    artist: 'Paula Temple',
    tagline: 'Noise Tekno EP',
    price: 6.99,
    artClass: 'artwork-gradient-5',
    description: 'Paula Temple pushes tekno into noise territory. Abrasive, political, essential.',
    tracks: 5,
    bpm: '150–160',
    format: 'WAV',
    badge: 'ltd',
  },
  {
    id: '6',
    title: 'PHASE ONE',
    artist: 'Phase Fatale',
    tagline: 'Dark Tekno EP',
    price: 6.99,
    artClass: 'artwork-gradient-6',
    description: 'Hypnotic dark tekno from Berghain\'s resident. Slow builds, relentless grooves.',
    tracks: 4,
    bpm: '138–143',
    format: 'WAV',
    badge: undefined,
  },
];

export const testimonials: Testimonial[] = [
  {
    name: 'Rebekah',
    role: 'Producer / Deconstruct Records',
    quote: '"The curation here is second to none. Every release is a deep excavation of what tekno can be. Essential for anyone serious about the sound."',
    initials: 'RE',
    color: '#9b59b6',
  },
  {
    name: 'Headless Horseman',
    role: 'DJ / Tsuba Records',
    quote: '"Finally a platform that understands tekno. The raw, uncompromising energy of these releases is exactly what the scene needs right now."',
    initials: 'HH',
    color: '#e63946',
  },
  {
    name: 'Matrixxman',
    role: 'Producer / Counterpoint',
    quote: '"VOID PROTOCOL hit me like a freight train. This is what industrial tekno should sound like — no compromise, pure machine energy."',
    initials: 'MX',
    color: '#4a6cf7',
  },
  {
    name: 'DJ Stingray',
    role: 'DJ / Tresor Records',
    quote: '"Tekno Babe consistently delivers the most forward-thinking catalog in the underground. The Detroit connection runs deep through every track."',
    initials: 'DS',
    color: '#00b4d8',
  },
];

export const pressItems: PressItem[] = [
  { outlet: 'Resident Advisor', award: 'Best Tekno Label 2025', year: 2025 },
  { outlet: 'Mixmag', award: 'Label of the Year', year: 2024 },
  { outlet: 'FACT Magazine', award: 'Essential Release', year: 2024 },
  { outlet: 'XLR8R', award: 'Editor\'s Choice', year: 2023 },
  { outlet: 'DJ Mag', award: 'Top 10 Underground', year: 2025 },
];
