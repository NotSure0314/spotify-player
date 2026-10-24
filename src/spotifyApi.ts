import { Playlist, Track } from './types';

export interface SpotifyUserProfile {
  id: string;
  uri: string;
  name: string;
  avatar: string | null;
  verified?: boolean;
}

const STORAGE_KEY_USER = 'spotify_synced_user_profile';

export function getSavedUserProfile(): SpotifyUserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUserProfile(user: SpotifyUserProfile | null) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  } catch (err) {
    console.error('Failed to save user profile:', err);
  }
}

export async function fetchUserProfile(username: string): Promise<{ user: SpotifyUserProfile; playlists: Playlist[] } | null> {
  try {
    const res = await fetch(`/api/user?username=${encodeURIComponent(username.trim())}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'User not found or has no public playlists');
    }
    const data = await res.json();
    if (!data.user) return null;

    saveUserProfile(data.user);
    return {
      user: data.user,
      playlists: data.playlists || []
    };
  } catch (err) {
    console.error('Error fetching user profile:', err);
    throw err;
  }
}

export async function fetchLivePlaylistDetails(uriOrId: string): Promise<Playlist | null> {
  try {
    const res = await fetch(`/api/playlist?id=${encodeURIComponent(uriOrId)}`);
    if (!res.ok) return null;
    const data: Playlist = await res.json();
    return data;
  } catch (err) {
    console.error('Error fetching playlist details:', err);
    return null;
  }
}

export interface SearchResult {
  tracks: Track[];
  playlists: Playlist[];
}

export async function searchSpotifyCatalog(query: string): Promise<SearchResult> {
  if (!query.trim()) return { tracks: [], playlists: [] };
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return { tracks: [], playlists: [] };
    const data = await res.json();
    return {
      tracks: data.tracks || [],
      playlists: data.playlists || []
    };
  } catch (err) {
    console.error('Error searching catalog:', err);
    return { tracks: [], playlists: [] };
  }
}

export async function importSpotifyPlaylist(urlOrUri: string): Promise<Playlist | null> {
  try {
    const res = await fetch(`/api/playlist?url=${encodeURIComponent(urlOrUri)}`);
    if (!res.ok) return null;
    const data: Playlist = await res.json();
    return data;
  } catch (err) {
    console.error('Error importing playlist:', err);
    return null;
  }
}
