import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import url from 'url';

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
          if (pathname === '/api/user') {
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

            const coverMap = new Map<string, string>();
            const albumMap = new Map<string, string>();

            // 1. Fetch main page initialState for real album covers
            try {
              const pageRes = await fetch(`https://open.spotify.com/playlist/${cleanId}`);
              if (pageRes.ok) {
                const pageHtml = await pageRes.text();
                const stateMatch = pageHtml.match(/<script id="initialState" type="text\/plain">([\s\S]*?)<\/script>/);
                if (stateMatch) {
                  const raw = Buffer.from(stateMatch[1], 'base64').toString('utf-8');
                  const json = JSON.parse(raw);
                  const item = json.entities?.items?.[`spotify:playlist:${cleanId}`];
                  (item?.content?.items || []).forEach((ci: any) => {
                    const data = ci?.itemV2?.data;
                    if (data?.uri) {
                      const cover = data.albumOfTrack?.coverArt?.sources?.[0]?.url;
                      const album = data.albumOfTrack?.name;
                      if (cover) coverMap.set(data.uri, cover);
                      if (album) albumMap.set(data.uri, album);
                    }
                  });
                }
              }
            } catch (e) {
              console.warn('InitialState extraction warning:', e);
            }

            // 2. Fetch embed page for all tracks
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

            // 3. For any tracks missing individual album covers, fetch from oEmbed
            const missingTracks = rawTrackList.filter((t: any) => !coverMap.has(t.uri));
            if (missingTracks.length > 0) {
              await Promise.all(missingTracks.slice(0, 30).map(async (t: any) => {
                try {
                  const trackId = t.uri.replace('spotify:track:', '');
                  const r = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`);
                  if (r.ok) {
                    const d = await r.json();
                    if (d.thumbnail_url) coverMap.set(t.uri, d.thumbnail_url);
                  }
                } catch {}
              }));
            }

            const tracks = rawTrackList.map((t: any, index: number) => {
              const trackCover = coverMap.get(t.uri) || playlistCover;
              const trackAlbum = albumMap.get(t.uri) || entity.name || entity.title || 'Spotify Playlist';

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
              id: entity.uri || `spotify:playlist:${cleanId}`,
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
