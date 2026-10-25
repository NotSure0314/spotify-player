import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';

const execAsync = promisify(exec);
const CLI_PATH = '/Applications/Spotify.app/Contents/MacOS/spotify_cli';

const coverCache = new Map<string, string>();

function getPlaylistGradient(title: string, idx: number = 0): string {
  const t = (title || '').toLowerCase();
  if (t.includes('kitter') || t.includes('hello')) return '#b91c1c';
  if (t.includes('gym')) return '#77010b';
  if (t.includes('kanye')) return '#831843';
  if (t.includes('white girl')) return '#db2777';
  if (t.includes('drake')) return '#312e81';
  if (t.includes('lofi') || t.includes('chill')) return '#4c1d95';
  const fallback = ['#77010b', '#831843', '#4c1d95', '#1e3a8a', '#78350f', '#065f46'];
  return fallback[idx % fallback.length];
}

// Fallback curated public playlists for standalone cloud deployment
const CURATED_PUBLIC_PLAYLISTS = [
  { id: '37i9dQZF1DXcBWIGoYBM5M', name: "Today's Top Hits", author: 'Spotify', keywords: 'top hits pop today popular chart' },
  { id: '37i9dQZF1DX0XUsuxWHRQd', name: 'RapCaviar', author: 'Spotify', keywords: 'rap hip hop trap caviar drake kendrick' },
  { id: '37i9dQZF1DX4t95PaoR1T0', name: 'Lofi Beats', author: 'Spotify', keywords: 'lofi beats chill study sleep relax' },
  { id: '37i9dQZF1DX4JAvHpjipBk', name: 'New Music Friday', author: 'Spotify', keywords: 'new music friday release fresh' },
  { id: '37i9dQZF1DX1lVhptIYRda', name: 'Hot Country', author: 'Spotify', keywords: 'country hot morgan wallen luke combs' },
  { id: '37i9dQZF1DX10zKzsJ2jva', name: 'Viva Latino', author: 'Spotify', keywords: 'latino reggaeton bad bunny spanish' },
  { id: '37i9dQZF1DX3oM43CtKnRV', name: '00s Rock Anthems', author: 'Spotify', keywords: 'rock 00s alternative guitar metal' },
  { id: '37i9dQZF1DX76t638V64Cr', name: 'No Brainer Workout', author: 'Spotify', keywords: 'workout gym pump training cardio run' },
  { id: '37i9dQZF1E4qQ00I1Jm1ay', name: 'Drake Radio', author: 'Spotify', keywords: 'drake ovo certified lover boy scorpion' },
  { id: '37i9dQZF1DZ06evO056t8v', name: 'This Is Kanye West', author: 'Spotify', keywords: 'kanye west ye graduation yeezus donda' },
  { id: '37i9dQZF1DZ06evO1V5gN6', name: 'This Is Taylor Swift', author: 'Spotify', keywords: 'taylor swift eras midnights folklore 1989' },
  { id: '37i9dQZF1DZ06evO2YpQ2O', name: 'This Is The Weeknd', author: 'Spotify', keywords: 'the weeknd abel after hours starboy' }
];

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = (req.query?.q || req.query?.query || '') as string;
  if (!query.trim()) {
    return res.status(200).json({ tracks: [], playlists: [] });
  }

  const trimmed = query.trim();

  try {
    // 1. Check if user searched for a specific Spotify playlist URL / URI
    const playlistUrlMatch = trimmed.match(/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/) ||
                             trimmed.match(/spotify:playlist:([a-zA-Z0-9]+)/);

    if (playlistUrlMatch) {
      const plId = playlistUrlMatch[1];
      try {
        const oembedRes = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/playlist/${plId}`);
        if (oembedRes.ok) {
          const odata = await oembedRes.json();
          const singlePlaylist = {
            id: `spotify:playlist:${plId}`,
            playlistId: plId,
            title: odata.title || 'Spotify Playlist',
            description: `Imported playlist`,
            author: 'Spotify',
            coverUrl: odata.thumbnail_url || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=300&q=80',
            gradient: getPlaylistGradient(odata.title || '', 0),
            tracks: []
          };
          return res.status(200).json({ tracks: [], playlists: [singlePlaylist] });
        }
      } catch {}
    }

    // 2. Check if user searched for a username (e.g. user:xxx, @xxx, or raw user ID)
    const userMatch = trimmed.match(/^user[:\s]+([a-zA-Z0-9_.-]+)$/i) || trimmed.match(/^@([a-zA-Z0-9_.-]+)$/);
    if (userMatch) {
      const username = userMatch[1];
      try {
        const userRes = await fetch(`https://open.spotify.com/user/${encodeURIComponent(username)}`);
        if (userRes.ok) {
          const userHtml = await userRes.text();
          const scriptMatch = userHtml.match(/<script id="initialState" type="text\/plain">([\s\S]*?)<\/script>/);
          if (scriptMatch) {
            const raw = Buffer.from(scriptMatch[1], 'base64').toString('utf-8');
            const json = JSON.parse(raw);
            const userKey = Object.keys(json.entities?.items || {})[0];
            const user = json.entities?.items?.[userKey];
            const rawItems = user?.publicPlaylistsV2?.items || user?.publicPlaylists?.items || [];
            const userPlaylists = rawItems.map((p: any, idx: number) => {
              const uri = p.data?.uri || p._uri || `spotify:playlist:${idx}`;
              const id = uri.replace('spotify:playlist:', '');
              const title = p.data?.name || 'Untitled Playlist';
              return {
                id: uri,
                playlistId: id,
                title,
                description: `By ${user?.name || username}`,
                author: user?.name || username,
                coverUrl: p.data?.images?.items?.[0]?.sources?.[0]?.url || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=300&q=80',
                gradient: getPlaylistGradient(title, idx),
                tracks: []
              };
            });
            return res.status(200).json({ tracks: [], playlists: userPlaylists });
          }
        }
      } catch {}
    }

    // 3. Search Songs via iTunes Search API in parallel
    const searchTracksPromise = (async () => {
      try {
        const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&entity=song&limit=25`;
        const itunesRes = await fetch(searchUrl);
        const data = await itunesRes.json();
        return (data.results || []).map((r: any, idx: number) => {
          const artwork = (r.artworkUrl100 || '').replace('100x100bb.jpg', '600x600bb.jpg') ||
                          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80';
          return {
            id: `track-${r.trackId || idx}`,
            title: r.trackName || 'Unknown Title',
            artist: r.artistName || 'Unknown Artist',
            album: r.collectionName || 'Single',
            duration: Math.round((r.trackTimeMillis || 180000) / 1000),
            coverUrl: artwork,
            audioUrl: r.previewUrl || undefined,
            gradient: '#831843',
            tempo: 90
          };
        });
      } catch {
        return [];
      }
    })();

    // 4. Search Playlists: First via Spotify CLI, then fallback to Curated Public Playlists
    const searchPlaylistsPromise = (async () => {
      let results: any[] = [];

      if (existsSync(CLI_PATH)) {
        try {
          const { stdout } = await execAsync(
            `"${CLI_PATH}" search "${trimmed.replace(/"/g, '')}" --type playlist --limit 12 --format json`,
            { timeout: 3000 }
          );
          const data = JSON.parse(stdout);
          const rawPlaylists = data.playlists || [];

          results = await Promise.all(
            rawPlaylists.map(async (p: any, idx: number) => {
              const cleanId = p.uri.replace('spotify:playlist:', '');
              let cover = coverCache.get(p.uri) || p.image || '';

              if (!cover || cover.startsWith('spotify:')) {
                try {
                  const r = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/playlist/${cleanId}`);
                  if (r.ok) {
                    const d = await r.json();
                    if (d.thumbnail_url) {
                      cover = d.thumbnail_url;
                      coverCache.set(p.uri, cover);
                    }
                  }
                } catch {}
              }

              return {
                id: p.uri,
                playlistId: cleanId,
                title: p.name || 'Untitled Playlist',
                description: p.author ? `By ${p.author}` : 'Spotify Playlist',
                author: p.author || 'Spotify',
                coverUrl: cover || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=300&q=80',
                gradient: getPlaylistGradient(p.name || '', idx),
                tracks: []
              };
            })
          );
        } catch {}
      }

      if (results.length === 0) {
        // Fallback: match against Curated Public Playlists
        const lowerQ = trimmed.toLowerCase();
        const matched = CURATED_PUBLIC_PLAYLISTS.filter(
          cp => cp.name.toLowerCase().includes(lowerQ) || cp.keywords.includes(lowerQ)
        );

        if (matched.length > 0) {
          results = await Promise.all(
            matched.slice(0, 8).map(async (cp, idx) => {
              let cover = coverCache.get(cp.id) || '';
              if (!cover) {
                try {
                  const r = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/playlist/${cp.id}`);
                  if (r.ok) {
                    const d = await r.json();
                    if (d.thumbnail_url) {
                      cover = d.thumbnail_url;
                      coverCache.set(cp.id, cover);
                    }
                  }
                } catch {}
              }
              return {
                id: `spotify:playlist:${cp.id}`,
                playlistId: cp.id,
                title: cp.name,
                description: `By ${cp.author}`,
                author: cp.author,
                coverUrl: cover || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=300&q=80',
                gradient: getPlaylistGradient(cp.name, idx),
                tracks: []
              };
            })
          );
        }
      }

      return results;
    })();

    const [tracks, playlists] = await Promise.all([searchTracksPromise, searchPlaylistsPromise]);

    return res.status(200).json({ tracks, playlists });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Search failed', tracks: [], playlists: [] });
  }
}
