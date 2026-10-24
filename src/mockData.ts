import { Playlist } from './types';

export const mockPlaylists: Playlist[] = [
  {
    id: 'playlist-chill-beats',
    title: 'Chill Lofi Study Beats',
    description: 'Soft beats to relax, study, and focus to. Updated every Friday.',
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=400&q=80',
    gradient: 'from-purple-900 to-indigo-950',
    tracks: [
      {
        id: 'track-1',
        title: 'Midnight Coffee',
        artist: 'Aether Echo',
        album: 'Late Night Sessions',
        duration: 168,
        coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=300&q=80',
        gradient: '#4c1d95',
        tempo: 68,
        lyrics: [
          'Raindrops tap on the window sill',
          'A quiet cup, the room is still',
          'Midnight memories drift away',
          'Waiting for the break of day',
          'Soft piano chords in the air',
          'No burdens left for us to bear'
        ]
      },
      {
        id: 'track-2',
        title: 'Tokyo Rain',
        artist: 'Kenji & The Rain',
        album: 'Shibuya Nights',
        duration: 195,
        coverUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=300&q=80',
        gradient: '#1e3a8a',
        tempo: 72,
        lyrics: [
          'Neon reflections in puddle glass',
          'Watching the umbrellas pass',
          'The subway hums below our feet',
          'A melody on every street',
          'Lost in the glow of electric blue',
          'Whispering a thought to you'
        ]
      },
      {
        id: 'track-3',
        title: 'Warm Sunlight',
        artist: 'Solaris Duo',
        album: 'Golden Hour',
        duration: 142,
        coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80',
        gradient: '#78350f',
        tempo: 80,
        lyrics: [
          'Golden rays across the floor',
          'Opening up the balcony door',
          'Breathe in the morning breeze',
          'Dancing gently through the trees'
        ]
      },
      {
        id: 'track-4',
        title: 'Velvet Horizon',
        artist: 'Luna Pulse',
        album: 'Echoes of Calm',
        duration: 210,
        coverUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=300&q=80',
        gradient: '#14532d',
        tempo: 70,
        lyrics: [
          'Sky turns purple, then fades to black',
          'There is no turning back',
          'Stars ignite one by one',
          'Another peaceful journey done'
        ]
      }
    ]
  },
  {
    id: 'playlist-synth-drive',
    title: 'Synthwave Night Drive',
    description: 'Retro-futuristic beats and 80s nostalgia for late highway drives.',
    coverUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=400&q=80',
    gradient: 'from-pink-900 to-rose-950',
    tracks: [
      {
        id: 'track-5',
        title: 'Cyber Highway 1984',
        artist: 'Vektor Drive',
        album: 'Neon Grid',
        duration: 228,
        coverUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=300&q=80',
        gradient: '#831843',
        tempo: 105,
        lyrics: [
          'Engine purrs at midnight high',
          'Underneath an electric sky',
          'Analog synths fill the car',
          'Driving past each distant star'
        ]
      },
      {
        id: 'track-6',
        title: 'Outrun Sunrise',
        artist: 'Kavinsky Waves',
        album: 'Turbo Boost',
        duration: 185,
        coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80',
        gradient: '#701a75',
        tempo: 110,
        lyrics: [
          'Fast forward to tomorrow',
          'Leaving behind the sorrow',
          'Digital dashboard glowing bright',
          'Racing past the speed of light'
        ]
      }
    ]
  },
  {
    id: 'playlist-deep-focus',
    title: 'Deep Focus & Flow',
    description: 'Ambient minimal textures designed to maximize deep creative focus.',
    coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80',
    gradient: 'from-emerald-900 to-teal-950',
    tracks: [
      {
        id: 'track-7',
        title: 'Binary Flow',
        artist: 'Turing Collective',
        album: 'Code Resonance',
        duration: 240,
        coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=300&q=80',
        gradient: '#064e3b',
        tempo: 64,
        lyrics: [
          'Lines of logic in the dark',
          'Every keystroke leaves a spark',
          'Building worlds in memory space',
          'Moving at a steady pace'
        ]
      }
    ]
  }
];

export const allTracks = mockPlaylists.flatMap(p => p.tracks);
