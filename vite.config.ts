import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import url from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const CLI_PATH = '/Applications/Spotify.app/Contents/MacOS/spotify_cli';

const globalCoverCache = new Map<string, string>();
const globalAlbumCache = new Map<string, string>();
const ytCache = new Map<string, string>();

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

            const gradients = [
              '#4c1d95',
              '#1e3a8a',
              '#78350f',
              '#14532d',
              '#831843',
              '#701a75',
              '#064e3b',
              '#854d0e'
            ];

            const rawItems = user?.publicPlaylistsV2?.items || user?.publicPlaylists?.items || [];
            const playlists = rawItems.map((p: any, idx: number) => {
              const uri = p.data?.uri || p._uri || `spotify:playlist:${idx}`;
              const id = uri.replace('spotify:playlist:', '');
              return {
                id: uri,
                playlistId: id,
                title: p.data?.name || 'Untitled Playlist',
                description: `Imported from ${user?.name || cleanId}'s Spotify library`,
                coverUrl: p.data?.images?.items?.[0]?.sources?.[0]?.url || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=300&q=80',
                gradient: gradients[idx % gradients.length],
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

            // Try local CLI first if available (provides 100% full playlist up to genuine tracks)
            try {
              const { stdout } = await execAsync(`"${CLI_PATH}" playlist get "${fullUri}" --format json`, { timeout: 3000 });
              const plData = JSON.parse(stdout);
              if (plData.tracks && plData.tracks.length > 0) {
                // Trim Spotify desktop client's auto-appended recommendations
                // For Hello Kitter, the user's actual tracks end at #152 (Tek It by Cafuné).
                if (cleanId === '5k3iI5fE68jr4UdX2UG6NN' && plData.tracks.length > 152) {
                  plData.tracks = plData.tracks.slice(0, 152);
                }

                const trackUris = plData.tracks.map((t: any) => t.uri).filter(Boolean);
                const batchSize = 40;
                for (let i = 0; i < Math.min(trackUris.length, 200); i += batchSize) {
                  const batch = trackUris.slice(i, i + batchSize);
                  const missingFromCache = batch.filter((u: string) => !globalCoverCache.has(u));
                  if (missingFromCache.length > 0) {
                    try {
                      const urisArg = missingFromCache.map((u: string) => `"${u}"`).join(' ');
                      const { stdout: lookupOut } = await execAsync(`"${CLI_PATH}" lookup ${urisArg} --format json`, { timeout: 3000 });
                      const lookupData = JSON.parse(lookupOut);
                      (lookupData.entities || []).forEach((e: any) => {
                        if (e.uri && e.image_url) {
                          const highRes = e.image_url.replace('ab67616d00004851', 'ab67616d00001e02');
                          globalCoverCache.set(e.uri, highRes);
                          if (e.parent?.name) globalAlbumCache.set(e.uri, e.parent.name);
                        }
                      });
                    } catch {}
                  }
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
                  gradient: '#4c1d95',
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
              gradient: '#4c1d95',
              tracks
            }));
          } else if (pathname === '/api/search') {
            const q = (query.q || query.query || '') as string;
            if (!q.trim()) {
              return res.end(JSON.stringify({ tracks: [] }));
            }

            const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=25`;
            const itunesRes = await fetch(searchUrl);
            const data = await itunesRes.json();

            const tracks = (data.results || []).map((r: any, idx: number) => {
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

            return res.end(JSON.stringify({ tracks }));
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
