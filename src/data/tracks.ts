export interface Track {
  id: string;
  title: string;
  artist: string;
  label: string;
  bpm: number;
  duration: string;
  genre: string;
  year: number;
  coverColor: string;
}

export interface Artist {
  id: string;
  name: string;
  origin: string;
  bio: string;
  tracks: number;
  accentColor: string;
}

export interface Label {
  id: string;
  name: string;
  origin: string;
  founded: number;
  releases: number;
  color: string;
}

export interface Event {
  id: string;
  name: string;
  venue: string;
  city: string;
  date: string;
  lineup: string[];
  price: string;
}

export const tracks: Track[] = [
  { id: '1', title: 'Acid Corridor', artist: 'Surgeon', label: 'Dynamic Tension', bpm: 145, duration: '7:42', genre: 'Industrial Tekno', year: 2023, coverColor: '#1a1a2e' },
  { id: '2', title: 'Black Monolith', artist: 'Alignment', label: 'BITE', bpm: 148, duration: '8:15', genre: 'Hard Tekno', year: 2024, coverColor: '#16213e' },
  { id: '3', title: 'Chloroform', artist: 'Phase Fatale', label: 'Afterlife', bpm: 143, duration: '6:50', genre: 'Tekno', year: 2023, coverColor: '#0f3460' },
  { id: '4', title: 'Dead Frequency', artist: 'SPFDJ', label: 'Intacto', bpm: 152, duration: '7:30', genre: 'Raw Tekno', year: 2024, coverColor: '#1a0a2e' },
  { id: '5', title: 'Electric Decay', artist: 'Matrixxman', label: 'Counterpoint', bpm: 140, duration: '6:22', genre: 'EBM Tekno', year: 2023, coverColor: '#0a1628' },
  { id: '6', title: 'Ferric Oxide', artist: 'Broken English Club', label: 'The Trilogy Tapes', bpm: 136, duration: '9:10', genre: 'Industrial', year: 2024, coverColor: '#1c1c1c' },
  { id: '7', title: 'Ghost Protocol', artist: 'Headless Horseman', label: 'Tsuba', bpm: 150, duration: '7:55', genre: 'Tekno', year: 2023, coverColor: '#0d1117' },
  { id: '8', title: 'Hypno Drill', artist: 'Paula Temple', label: 'Noise Manifesto', bpm: 155, duration: '6:40', genre: 'Hard Tekno', year: 2024, coverColor: '#1a0a0a' },
  { id: '9', title: 'Iron Lung', artist: 'Ancient Methods', label: 'Methods Of Disorder', bpm: 146, duration: '8:00', genre: 'Industrial Tekno', year: 2023, coverColor: '#111827' },
  { id: '10', title: 'Jericho', artist: 'Rebekah', label: 'Deconstruct', bpm: 144, duration: '7:18', genre: 'Tekno', year: 2024, coverColor: '#1f1f2e' },
  { id: '11', title: 'Katakomba', artist: 'Coeo', label: 'Lobster Theremin', bpm: 138, duration: '6:05', genre: 'Tekno', year: 2023, coverColor: '#12121c' },
  { id: '12', title: 'Laser Grids', artist: 'DJ Stingray', label: 'Tresor', bpm: 142, duration: '7:48', genre: 'Detroit Tekno', year: 2024, coverColor: '#0c1a0c' },
];

export const artists: Artist[] = [
  { id: '1', name: 'Surgeon', origin: 'Birmingham, UK', bio: 'Anthony Child is a pioneering force in industrial techno, known for brutal precision and uncompromising sound design.', tracks: 180, accentColor: '#e8ff00' },
  { id: '2', name: 'SPFDJ', origin: 'Paris, FR', bio: 'Rising star of the hard tekno scene, bringing relentless energy and modern industrial aggression to global stages.', tracks: 45, accentColor: '#ff2d55' },
  { id: '3', name: 'Paula Temple', origin: 'London, UK', bio: 'Sonic provocateur and label founder, pushing the boundaries of noise, tekno and experimental electronics.', tracks: 92, accentColor: '#00d4ff' },
  { id: '4', name: 'Ancient Methods', origin: 'Berlin, DE', bio: 'Master of dark industrial techno, creator of visceral warehouse experiences through dense, hypnotic soundscapes.', tracks: 134, accentColor: '#ff6600' },
  { id: '5', name: 'Rebekah', origin: 'Birmingham, UK', bio: 'A key figure in the techno underground, Rebekah combines raw emotion with machine-like precision.', tracks: 87, accentColor: '#9b59b6' },
  { id: '6', name: 'Phase Fatale', origin: 'Berlin, DE', bio: 'Resident at Berghain, Phase Fatale crafts hypnotic journeys through dark, melodic industrial techno.', tracks: 63, accentColor: '#1abc9c' },
];

export const labels: Label[] = [
  { id: '1', name: 'Tresor', origin: 'Berlin, DE', founded: 1991, releases: 220, color: '#e8ff00' },
  { id: '2', name: 'Noise Manifesto', origin: 'London, UK', founded: 2012, releases: 48, color: '#ff2d55' },
  { id: '3', name: 'Methods Of Disorder', origin: 'Berlin, DE', founded: 2008, releases: 67, color: '#00d4ff' },
  { id: '4', name: 'BITE', origin: 'London, UK', founded: 2018, releases: 32, color: '#ff6600' },
  { id: '5', name: 'Intacto', origin: 'Barcelona, ES', founded: 2003, releases: 156, color: '#9b59b6' },
  { id: '6', name: 'Dynamic Tension', origin: 'Birmingham, UK', founded: 1997, releases: 89, color: '#1abc9c' },
];

export const events: Event[] = [
  { id: '1', name: 'MONOLITH', venue: 'Tresor', city: 'Berlin', date: 'Nov 1, 2026', lineup: ['Surgeon', 'Paula Temple', 'Ancient Methods'], price: '€15' },
  { id: '2', name: 'DISTORTION RAVE', venue: 'Fabric', city: 'London', date: 'Nov 8, 2026', lineup: ['SPFDJ', 'Rebekah', 'Headless Horseman'], price: '£20' },
  { id: '3', name: 'SECTOR ZERO', venue: 'De School', city: 'Amsterdam', date: 'Nov 15, 2026', lineup: ['Phase Fatale', 'DJ Stingray', 'Matrixxman'], price: '€18' },
  { id: '4', name: 'IRON CURTAIN', venue: 'Bassiani', city: 'Tbilisi', date: 'Nov 22, 2026', lineup: ['Ancient Methods', 'Broken English Club', 'Surgeon'], price: '₾40' },
  { id: '5', name: 'MACHINE ROOM', venue: 'Rex Club', city: 'Paris', date: 'Dec 5, 2026', lineup: ['SPFDJ', 'Paula Temple', 'Alignment'], price: '€12' },
  { id: '6', name: 'VOID PARTY', venue: 'OHM', city: 'Berlin', date: 'Dec 12, 2026', lineup: ['Rebekah', 'Phase Fatale', 'Coeo'], price: '€10' },
];
