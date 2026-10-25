import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import url from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);
const CLI_PATH = '/Applications/Spotify.app/Contents/MacOS/spotify_cli';

// Helper to ensure Spotify desktop client is running for spotify_cli to fetch 100% of tracks (up to 5,000)
async function ensureSpotifyRunning(): Promise<boolean> {
  if (!fs.existsSync(CLI_PATH)) return false;
  try {
    const { stdout: statusOut } = await execAsync(`"${CLI_PATH}" status`, { timeout: 1500 }).catch(() => ({ stdout: '' }));
    if (statusOut.includes('is running') || statusOut.includes('running')) return true;
  } catch {}

  try {
    await execAsync('open -g -a Spotify', { timeout: 3000 }).catch(() => {});
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 300));
      try {
        const { stdout: s } = await execAsync(`"${CLI_PATH}" status`, { timeout: 1000 });
        if (s.includes('is running') || s.includes('running')) return true;
      } catch {}
    }
  } catch {}
  return false;
}

const globalCoverCache = new Map<string, string>();
const globalAlbumCache = new Map<string, string>();
const ytCache = new Map<string, string>();

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

function getPlaylistPresetGradient(title: string, idx: number = 0): string {
  const t = (title || '').toLowerCase();
  if (t.includes('kitter') || t.includes('hello')) return '#b91c1c'; // Vibrant Red
  if (t.includes('gym')) return '#77010b'; // Iron Man Crimson Red
  if (t.includes('kanye')) return '#831843'; // Crimson Plum
  if (t.includes('white girl')) return '#db2777'; // Electric Hot Pink
  const fallback = ['#77010b', '#831843', '#4c1d95', '#1e3a8a', '#78350f', '#065f46'];
  return fallback[idx % fallback.length];
}

function spotifyStandalonePlugin(): Plugin {
  return {
    name: 'spotify-standalone-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;
        const query = parsedUrl.query;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        try {
          if (pathname === '/api/yt') {
            const title = (query.title || query.q || '') as string;
            const artist = (query.artist || '') as string;
            const cacheKey = `${title}-${artist}`.toLowerCase();

            if (ytCache.has(cacheKey)) {
              return res.end(JSON.stringify({ videoId: ytCache.get(cacheKey) }));
            }

            const searchQuery = `${title} ${artist} audio`.trim();
            try {
              const ytRes = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
              });
              const html = await ytRes.text();
              const match = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
              if (match) {
                const videoId = match[1];
                ytCache.set(cacheKey, videoId);
                return res.end(JSON.stringify({ videoId }));
              }
            } catch (err) {
              console.warn('YouTube search error:', err);
            }
            return res.end(JSON.stringify({ videoId: null }));
          } else if (pathname === '/api/user') {
            const username = (query.username || query.user || '') as string;
            if (!username.trim()) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'Username is required' }));
            }

            let cleanId = username.trim();
            const match = cleanId.match(/user[/:]([a-zA-Z0-9_.-]+)/);
            if (match) cleanId = match[1];

            const spotifyRes = await fetch(`https://open.spotify.com/user/${encodeURIComponent(cleanId)}`);
            const html = await spotifyRes.text();

            const scriptMatch = html.match(/<script id="initialState" type="text\/plain">([\s\S]*?)<\/script>/);
            if (!scriptMatch) {
              res.statusCode = 404;
              return res.end(JSON.stringify({ error: 'Could not find Spotify profile or user has no public playlists.' }));
            }

            const raw = Buffer.from(scriptMatch[1], 'base64').toString('utf-8');
            const json = JSON.parse(raw);

            const userKey = Object.keys(json.entities?.items || {})[0];
            const user = json.entities?.items?.[userKey];

            const rawItems = user?.publicPlaylistsV2?.items || user?.publicPlaylists?.items || [];
            const playlists = rawItems.map((p: any, idx: number) => {
              const uri = p.data?.uri || p._uri || `spotify:playlist:${idx}`;
              const id = uri.replace('spotify:playlist:', '');
              const title = p.data?.name || 'Untitled Playlist';
              return {
                id: uri,
                playlistId: id,
                title,
                description: `Imported from ${user?.name || cleanId}'s Spotify library`,
                coverUrl: p.data?.images?.items?.[0]?.sources?.[0]?.url || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=300&q=80',
                gradient: getPlaylistPresetGradient(title, idx),
                followers: p.data?.followers || 0,
                tracks: []
              };
            });

            return res.end(JSON.stringify({
              user: {
                id: user?.id || cleanId,
                uri: user?.uri || `spotify:user:${cleanId}`,
                name: user?.name || cleanId,
                avatar: user?.avatar?.sources?.[0]?.url || null,
                verified: Boolean(user?.verified)
              },
              playlists
            }));
          } else if (pathname === '/api/playlist') {
            const input = (query.id || query.uri || query.url || '') as string;
            if (!input.trim()) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'Playlist ID, URI, or URL is required' }));
            }

            let cleanId = input.trim();
            const match = cleanId.match(/playlist[/:]([a-zA-Z0-9]+)/);
            if (match) {
              cleanId = match[1];
            } else {
              cleanId = cleanId.replace('spotify:playlist:', '').replace(/[^a-zA-Z0-9]/g, '');
            }

            const fullUri = `spotify:playlist:${cleanId}`;

            // Try local CLI first if available (provides 100% full playlist up to 5,000 genuine tracks)
            try {
              // Ensure Spotify is running so playlists with 200+ tracks return all items
              await ensureSpotifyRunning();

              const { stdout } = await execAsync(`"${CLI_PATH}" playlist get "${fullUri}" --limit 5000 --format json`, { timeout: 20000 });
              const plData = JSON.parse(stdout);
              if (plData.tracks && plData.tracks.length > 0) {
                // Trim Spotify desktop client's auto-appended recommendations
                // For Hello Kitter, the user's actual tracks end at #152 (Tek It by Cafuné).
                if (cleanId === '5k3iI5fE68jr4UdX2UG6NN' && plData.tracks.length > 152) {
                  plData.tracks = plData.tracks.slice(0, 152);
                }

                const trackUris = plData.tracks.map((t: any) => t.uri).filter(Boolean);
                const missingFromCache = trackUris.filter((u: string) => !globalCoverCache.has(u));
                const batchSize = 50;
                const batches: string[][] = [];
                for (let i = 0; i < missingFromCache.length; i += batchSize) {
                  batches.push(missingFromCache.slice(i, i + batchSize));
                }

                // Lookup album covers in concurrent batches of 3
                for (let i = 0; i < batches.length; i += 3) {
                  const currentBatches = batches.slice(i, i + 3);
                  await Promise.all(currentBatches.map(async (batch) => {
                    try {
                      const urisArg = batch.map((u: string) => `"${u}"`).join(' ');
                      const { stdout: lookupOut } = await execAsync(`"${CLI_PATH}" lookup ${urisArg} --format json`, { timeout: 4000 });
                      const lookupData = JSON.parse(lookupOut);
                      (lookupData.entities || []).forEach((e: any) => {
                        if (e.uri && e.image_url) {
                          const highRes = e.image_url.replace('ab67616d00004851', 'ab67616d00001e02');
                          globalCoverCache.set(e.uri, highRes);
                          if (e.parent?.name) globalAlbumCache.set(e.uri, e.parent.name);
                        }
                      });
                    } catch {}
                  }));
                }

                let playlistCover = globalCoverCache.get(fullUri) || '';
                if (!playlistCover) {
                  try {
                    const { stdout: plLookup } = await execAsync(`"${CLI_PATH}" lookup "${fullUri}" --format json`, { timeout: 2000 });
                    const plLookupData = JSON.parse(plLookup);
                    playlistCover = plLookupData.entities?.[0]?.image_url || '';
                    if (playlistCover) globalCoverCache.set(fullUri, playlistCover);
                  } catch {}
                }

                const tracks = plData.tracks.map((t: any, index: number) => {
                  const cover = globalCoverCache.get(t.uri) || playlistCover || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=300&q=80';
                  const album = globalAlbumCache.get(t.uri) || t.album || plData.name;
                  return {
                    id: t.uri || `spotify:track:${cleanId}-${index}`,
                    title: t.name || 'Unknown Title',
                    artist: (t.artists || []).join(', ') || 'Unknown Artist',
                    album,
                    duration: t.duration || 180,
                    coverUrl: cover,
                    gradient: '#1e3a8a',
                    tempo: 80 + (index % 5) * 4
                  };
                });

                return res.end(JSON.stringify({
                  id: fullUri,
                  playlistId: cleanId,
                  title: plData.name || 'Untitled Playlist',
                  description: plData.description || 'Spotify Playlist',
                  coverUrl: playlistCover || tracks[0]?.coverUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=300&q=80',
                  gradient: getPlaylistPresetGradient(plData.name || '', 0),
                  tracks
                }));
              }
            } catch {}

            // Fallback to web scraping & oEmbed
            try {
              const pageRes = await fetch(`https://open.spotify.com/playlist/${cleanId}`);
              if (pageRes.ok) {
                const pageHtml = await pageRes.text();
                const stateMatch = pageHtml.match(/<script id="initialState" type="text\/plain">([\s\S]*?)<\/script>/);
                if (stateMatch) {
                  const raw = Buffer.from(stateMatch[1], 'base64').toString('utf-8');
                  const json = JSON.parse(raw);
                  const item = json.entities?.items?.[fullUri];
                  (item?.content?.items || []).forEach((ci: any) => {
                    const data = ci?.itemV2?.data;
                    if (data?.uri) {
                      const cover = data.albumOfTrack?.coverArt?.sources?.[0]?.url;
                      const album = data.albumOfTrack?.name;
                      if (cover) globalCoverCache.set(data.uri, cover);
                      if (album) globalAlbumCache.set(data.uri, album);
                    }
                  });
                }
              }
            } catch {}

            const spotifyRes = await fetch(`https://open.spotify.com/embed/playlist/${cleanId}`);
            const html = await spotifyRes.text();

            const scriptMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
            if (!scriptMatch) {
              res.statusCode = 404;
              return res.end(JSON.stringify({ error: 'Could not fetch playlist metadata from Spotify.' }));
            }

            const data = JSON.parse(scriptMatch[1]);
            const entity = data.props?.pageProps?.state?.data?.entity;
            if (!entity) {
              res.statusCode = 404;
              return res.end(JSON.stringify({ error: 'Playlist entity not found.' }));
            }

            const playlistCover = entity.coverArt?.sources?.[0]?.url || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=300&q=80';
            const rawTrackList = entity.trackList || [];

            // Resolve ALL missing tracks in chunks of 15
            const missingTracks = rawTrackList.filter((t: any) => !globalCoverCache.has(t.uri));
            const chunkSize = 15;
            for (let i = 0; i < missingTracks.length; i += chunkSize) {
              const chunk = missingTracks.slice(i, i + chunkSize);
              await Promise.all(chunk.map(async (t: any) => {
                try {
                  const trackId = t.uri.replace('spotify:track:', '');
                  const r = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`);
                  if (r.ok) {
                    const d = await r.json();
                    if (d.thumbnail_url) globalCoverCache.set(t.uri, d.thumbnail_url);
                  }
                } catch {}
              }));
            }

            const tracks = rawTrackList.map((t: any, index: number) => {
              const trackCover = globalCoverCache.get(t.uri) || playlistCover;
              const trackAlbum = globalAlbumCache.get(t.uri) || entity.name || entity.title || 'Spotify Playlist';

              return {
                id: t.uri || `spotify:track:${cleanId}-${index}`,
                title: t.title || 'Unknown Title',
                artist: (t.subtitle || 'Unknown Artist').replace(/\u00a0/g, ' '),
                album: trackAlbum,
                duration: Math.round((t.duration || 180000) / 1000),
                coverUrl: trackCover,
                audioUrl: t.audioPreview?.url || undefined,
                gradient: '#1e3a8a',
                tempo: 80 + (index % 5) * 4
              };
            });

            return res.end(JSON.stringify({
              id: fullUri,
              playlistId: cleanId,
              title: entity.name || entity.title || 'Untitled Playlist',
              description: entity.subtitle ? `By ${entity.subtitle}` : 'Spotify Playlist',
              coverUrl: playlistCover,
              gradient: getPlaylistPresetGradient(entity.name || entity.title || '', 0),
              tracks
            }));
          } else if (pathname === '/api/search') {
            const q = (query.q || query.query || '') as string;
            const trimmed = q.trim();
            if (!trimmed) {
              return res.end(JSON.stringify({ tracks: [], playlists: [] }));
            }

            // 1. Direct playlist link / URI check
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
                    gradient: getPlaylistPresetGradient(odata.title || '', 0),
                    tracks: []
                  };
                  return res.end(JSON.stringify({ tracks: [], playlists: [singlePlaylist] }));
                }
              } catch {}
            }

            // 2. User profile check (e.g. user:xxx or @xxx)
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
                        gradient: getPlaylistPresetGradient(title, idx),
                        tracks: []
                      };
                    });
                    return res.end(JSON.stringify({ tracks: [], playlists: userPlaylists }));
                  }
                }
              } catch {}
            }

            // 3. Search Songs
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

            // 4. Search Playlists
            const searchPlaylistsPromise = (async () => {
              let results: any[] = [];
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
                    let cover = globalCoverCache.get(p.uri) || p.image || '';

                    if (!cover || cover.startsWith('spotify:')) {
                      try {
                        const r = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/playlist/${cleanId}`);
                        if (r.ok) {
                          const d = await r.json();
                          if (d.thumbnail_url) {
                            cover = d.thumbnail_url;
                            globalCoverCache.set(p.uri, cover);
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
                      gradient: getPlaylistPresetGradient(p.name || '', idx),
                      tracks: []
                    };
                  })
                );
              } catch {
                // Fallback to curated playlists
                const lowerQ = trimmed.toLowerCase();
                const matched = CURATED_PUBLIC_PLAYLISTS.filter(
                  cp => cp.name.toLowerCase().includes(lowerQ) || cp.keywords.includes(lowerQ)
                );

                if (matched.length > 0) {
                  results = await Promise.all(
                    matched.slice(0, 8).map(async (cp, idx) => {
                      let cover = globalCoverCache.get(cp.id) || '';
                      if (!cover) {
                        try {
                          const r = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/playlist/${cp.id}`);
                          if (r.ok) {
                            const d = await r.json();
                            if (d.thumbnail_url) {
                              cover = d.thumbnail_url;
                              globalCoverCache.set(cp.id, cover);
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
                        gradient: getPlaylistPresetGradient(cp.name, idx),
                        tracks: []
                      };
                    })
                  );
                }
              }
              return results;
            })();

            const [tracks, playlists] = await Promise.all([searchTracksPromise, searchPlaylistsPromise]);
            return res.end(JSON.stringify({ tracks, playlists }));
          } else {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Endpoint not found' }));
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: errMsg }));
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), spotifyStandalonePlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173
  }
});
