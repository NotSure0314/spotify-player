import { Playlist, Track, Artist } from './types';

export interface SpotifyUserProfile {
  id: string;
  uri: string;
  name: string;
  avatar: string | null;
  verified?: boolean;
}

const STORAGE_KEY_USER = 'spotify_synced_user_profile';
const STORAGE_KEY_IMPORTED_PLAYLISTS = 'spotify_imported_playlists';
const STORAGE_KEY_LIKED_TRACKS = 'spotify_liked_tracks';
const STORAGE_KEY_PINNED_PLAYLISTS = 'spotify_pinned_playlists';
const STORAGE_KEY_REMOVED_PLAYLISTS = 'spotify_removed_playlists';

export function getSavedRemovedPlaylistIds(userId?: string): Set<string> {
  try {
    const currentUserId = userId || getSavedUserProfile()?.id;
    const key = currentUserId ? `${STORAGE_KEY_REMOVED_PLAYLISTS}_${currentUserId}` : STORAGE_KEY_REMOVED_PLAYLISTS;
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveRemovedPlaylistIds(ids: Set<string>, userId?: string) {
  try {
    const currentUserId = userId || getSavedUserProfile()?.id;
    const key = currentUserId ? `${STORAGE_KEY_REMOVED_PLAYLISTS}_${currentUserId}` : STORAGE_KEY_REMOVED_PLAYLISTS;
    localStorage.setItem(key, JSON.stringify(Array.from(ids)));
  } catch (err) {
    console.error('Failed to save removed playlist IDs:', err);
  }
}

export function addRemovedPlaylistId(playlistId: string, userId?: string) {
  const cleanId = playlistId.replace('spotify:playlist:', '').replace('spotify:album:', '');
  const ids = getSavedRemovedPlaylistIds(userId);
  ids.add(cleanId);
  ids.add(playlistId);
  saveRemovedPlaylistIds(ids, userId);
}

export function clearRemovedPlaylistId(playlistId: string, userId?: string) {
  const cleanId = playlistId.replace('spotify:playlist:', '').replace('spotify:album:', '');
  const ids = getSavedRemovedPlaylistIds(userId);
  ids.delete(cleanId);
  ids.delete(playlistId);
  saveRemovedPlaylistIds(ids, userId);
}

export function getSavedImportedPlaylists(userId?: string): Playlist[] {
  try {
    const currentUserId = userId || getSavedUserProfile()?.id;
    const key = currentUserId ? `${STORAGE_KEY_IMPORTED_PLAYLISTS}_${currentUserId}` : STORAGE_KEY_IMPORTED_PLAYLISTS;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    if (!currentUserId) {
      const legacy = localStorage.getItem(STORAGE_KEY_IMPORTED_PLAYLISTS);
      return legacy ? JSON.parse(legacy) : [];
    }
    return [];
  } catch {
    return [];
  }
}

export function saveImportedPlaylists(playlists: Playlist[], userId?: string) {
  try {
    const currentUserId = userId || getSavedUserProfile()?.id;
    const key = currentUserId ? `${STORAGE_KEY_IMPORTED_PLAYLISTS}_${currentUserId}` : STORAGE_KEY_IMPORTED_PLAYLISTS;
    localStorage.setItem(key, JSON.stringify(playlists));
  } catch (err) {
    console.error('Failed to save imported playlists:', err);
  }
}

export function addImportedPlaylist(playlist: Playlist, userId?: string) {
  try {
    const currentUserId = userId || getSavedUserProfile()?.id;
    const existing = getSavedImportedPlaylists(currentUserId);
    const cleanId = (playlist.playlistId || playlist.id).replace('spotify:playlist:', '').replace('spotify:album:', '');
    const filtered = existing.filter(p => {
      const pClean = (p.playlistId || p.id).replace('spotify:playlist:', '').replace('spotify:album:', '');
      return p.id !== playlist.id && pClean !== cleanId;
    });
    const updated = [playlist, ...filtered];
    saveImportedPlaylists(updated, currentUserId);
    clearRemovedPlaylistId(playlist.id, currentUserId);
    if (playlist.playlistId) {
      clearRemovedPlaylistId(playlist.playlistId, currentUserId);
    }
  } catch (err) {
    console.error('Failed to add imported playlist:', err);
  }
}

export function removeImportedPlaylist(playlistId: string, userId?: string) {
  try {
    const currentUserId = userId || getSavedUserProfile()?.id;
    const existing = getSavedImportedPlaylists(currentUserId);
    const cleanId = playlistId.replace('spotify:playlist:', '').replace('spotify:album:', '');
    const updated = existing.filter(p => {
      const pClean = (p.playlistId || p.id).replace('spotify:playlist:', '').replace('spotify:album:', '');
      return p.id !== playlistId && pClean !== cleanId;
    });
    saveImportedPlaylists(updated, currentUserId);
    addRemovedPlaylistId(playlistId, currentUserId);
  } catch (err) {
    console.error('Failed to remove imported playlist:', err);
  }
}

export function getSavedLikedTrackIds(userId?: string): Set<string> {
  try {
    const currentUserId = userId || getSavedUserProfile()?.id;
    const key = currentUserId ? `${STORAGE_KEY_LIKED_TRACKS}_${currentUserId}` : STORAGE_KEY_LIKED_TRACKS;
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveLikedTrackIds(ids: Set<string>, userId?: string) {
  try {
    const currentUserId = userId || getSavedUserProfile()?.id;
    const key = currentUserId ? `${STORAGE_KEY_LIKED_TRACKS}_${currentUserId}` : STORAGE_KEY_LIKED_TRACKS;
    localStorage.setItem(key, JSON.stringify(Array.from(ids)));
  } catch (err) {
    console.error('Failed to save liked track IDs:', err);
  }
}

export function getSavedPinnedPlaylistIds(userId?: string): string[] {
  try {
    const currentUserId = userId || getSavedUserProfile()?.id;
    const key = currentUserId ? `${STORAGE_KEY_PINNED_PLAYLISTS}_${currentUserId}` : STORAGE_KEY_PINNED_PLAYLISTS;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePinnedPlaylistIds(ids: string[], userId?: string) {
  try {
    const currentUserId = userId || getSavedUserProfile()?.id;
    const key = currentUserId ? `${STORAGE_KEY_PINNED_PLAYLISTS}_${currentUserId}` : STORAGE_KEY_PINNED_PLAYLISTS;
    localStorage.setItem(key, JSON.stringify(ids));
  } catch (err) {
    console.error('Failed to save pinned playlist IDs:', err);
  }
}

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

export interface LastAccount {
  id: string;
  name?: string;
}

export const STORAGE_KEY_LAST_ACCOUNT = 'spotify_player_last_account';

export function getSavedLastAccount(): LastAccount | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_ACCOUNT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) return parsed;
    }
    // Fallback: discover other previously used account in localStorage
    const currentUserId = getSavedUserProfile()?.id;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('spotify_imported_playlists_')) {
        const id = key.replace('spotify_imported_playlists_', '');
        if (id && id !== currentUserId) {
          return { id, name: id === 'spotify' ? 'Spotify Official' : id };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function saveLastAccount(account: LastAccount) {
  try {
    localStorage.setItem(STORAGE_KEY_LAST_ACCOUNT, JSON.stringify(account));
  } catch (err) {
    console.error('Failed to save last account:', err);
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
  artists: Artist[];
}

export async function searchSpotifyCatalog(query: string): Promise<SearchResult> {
  if (!query.trim()) return { tracks: [], playlists: [], artists: [] };
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return { tracks: [], playlists: [], artists: [] };
    const data = await res.json();
    return {
      tracks: data.tracks || [],
      playlists: data.playlists || [],
      artists: data.artists || []
    };
  } catch (err) {
    console.error('Error searching catalog:', err);
    return { tracks: [], playlists: [], artists: [] };
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
