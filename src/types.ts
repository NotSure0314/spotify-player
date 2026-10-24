export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  coverUrl: string;
  gradient: string;
  audioUrl?: string; // Optional real URL, or synthesizes chill lofi beat
  tempo?: number; // for procedural synth generator
  scale?: number[];
  lyrics?: string[];
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  gradient: string;
  tracks: Track[];
}

export type RepeatMode = 'off' | 'all' | 'one';
