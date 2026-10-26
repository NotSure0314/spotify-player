import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { createHmac } from 'crypto';
import { SONGS_PLAYLIST_TRACKS } from '../src/utils/songsPlaylistData';

const execAsync = promisify(exec);
const CLI_PATH = '/Applications/Spotify.app/Contents/MacOS/spotify_cli';

// In-memory cache for track covers and token across requests
const globalCoverCache = new Map<string, string>();
const globalAlbumCache = new Map<string, string>();
let cachedToken: string | null = null;
let cachedTokenExpiry = 0;

function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

function getTOTP(secretBase32: string, timeStep = 30): string {
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / timeStep);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0;
  const bytes: number[] = [];
  for (const char of secretBase32.toUpperCase()) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  const hmac = createHmac('sha1', Buffer.from(bytes));
  hmac.update(counterBuffer);
  const digest = hmac.digest();
  const offset = digest[digest.length - 1] & 0xf;
  const code = (
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  ) % 1000000;
  return code.toString().padStart(6, '0');
}

async function getSpotifyToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiry - 60000) {
    return cachedToken;
  }

  try {
    const version = 61;
    const secretBytes = [44,55,47,42,70,40,34,114,76,74,50,111,120,97,75,76,94,102,43,69,49,120,118,80,64,78];
    const transformed = secretBytes.map((e, t) => e ^ ((t % 33) + 9));
    const hexStr = Buffer.from(transformed.join(''), 'utf8').toString('hex');
    const secret = base32Encode(Buffer.from(hexStr, 'hex'));
    const totp = getTOTP(secret);

    const tokenRes = await fetch(
      `https://open.spotify.com/api/token?reason=init&productType=web-player&totp=${totp}&totpVer=${version}&totpServer=${totp}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://open.spotify.com/'
        }
      }
    );
    if (!tokenRes.ok) return null;
    const data = await tokenRes.json();
    if (data.accessToken) {
      cachedToken = data.accessToken;
      cachedTokenExpiry = data.accessTokenExpirationTimestampMs || (Date.now() + 3600000);
      return cachedToken;
    }
  } catch (err) {
    console.warn('Failed to retrieve Spotify web token:', err);
  }
  return null;
}

const getPlaylistPresetGradient = (title: string) => {
  const t = (title || '').toLowerCase();
  if (t.includes('kitter') || t.includes('hello')) return '#b91c1c';
  if (t.includes('gym')) return '#77010b';
  if (t.includes('kanye')) return '#831843';
  if (t.includes('white girl')) return '#db2777';
  return '#77010b';
};

async function fetchPlaylistViaPathfinder(cleanId: string, fullUri: string) {
  const token = await getSpotifyToken();
  if (!token) return null;

  let offset = 0;
  const limit = 200;
  const allTracks: any[] = [];
  let playlistMeta: any = null;

  while (true) {
    const res = await fetch('https://api-partner.spotify.com/pathfinder/v2/query', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json;charset=UTF-8',
        'Accept': 'application/json',
        'app-platform': 'WebPlayer',
        'spotify-app-version': '1.3.8.509.g26b6eac7300d',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://open.spotify.com/'
      },
      body: JSON.stringify({
        variables: {
          uri: fullUri,
          offset,
          limit,
          enableWatchFeedEntrypoint: false,
          includeEpisodeContentRatingsV2: true
        },
        operationName: 'fetchPlaylist',
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: '21ea11a6ac75a5f3e01fd365d29c18e0a4a8b7dc09f89bbb5d73910190c6acaf'
          }
        }
      })
    });

    if (!res.ok) break;
    const data = await res.json();
    const pl = data.data?.playlistV2;
    if (!pl) break;

    if (!playlistMeta) {
      playlistMeta = {
        name: pl.name,
        description: pl.description || 'Spotify Playlist',
        owner: pl.ownerV2?.data?.name || (cleanId === '5k3iI5fE68jr4UdX2UG6NN' ? 'Shreeji' : 'Spotify'),
        totalCount: pl.content?.totalCount || 0,
        coverUrl: pl.images?.items?.[0]?.sources?.[0]?.url || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=300&q=80'
      };
    }

    const items = pl.content?.items || [];
    for (const item of items) {
      const d = item.itemV2?.data;
      if (!d) continue;
      const artists = (d.artists?.items || []).map((a: any) => a.profile?.name).filter(Boolean).join(', ');
      const cover = d.albumOfTrack?.coverArt?.sources?.[0]?.url;
      const album = d.albumOfTrack?.name;
      if (d.uri && cover) globalCoverCache.set(d.uri, cover);
      if (d.uri && album) globalAlbumCache.set(d.uri, album);

      allTracks.push({
        id: d.uri,
        title: d.name || 'Unknown Track',
        artist: artists || 'Unknown Artist',
        album: album || playlistMeta.name,
        duration: Math.round((d.trackDuration?.totalMilliseconds || 180000) / 1000),
        coverUrl: cover || playlistMeta.coverUrl,
        gradient: '#1e3a8a',
        tempo: Math.round(d.playlistAudioAttributes?.bpm || 100)
      });
    }

    if (items.length < limit || allTracks.length >= (pl.content?.totalCount || 0)) {
      break;
    }
    offset += items.length;
  }

  if (!playlistMeta || allTracks.length === 0) return null;

  return {
    id: fullUri,
    playlistId: cleanId,
    title: playlistMeta.name || 'Untitled Playlist',
    description: playlistMeta.description,
    author: playlistMeta.owner,
    coverUrl: playlistMeta.coverUrl,
    gradient: getPlaylistPresetGradient(playlistMeta.name || ''),
    tracks: allTracks
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const input = (req.query?.id || req.query?.uri || req.query?.url || '') as string;
  if (!input.trim()) {
    return res.status(400).json({ error: 'Playlist ID, URI, or URL is required' });
  }

  let cleanId = input.trim();
  const match = cleanId.match(/playlist[/:]([a-zA-Z0-9]+)/);
  if (match) {
    cleanId = match[1];
  } else {
    cleanId = cleanId.replace('spotify:playlist:', '').replace(/[^a-zA-Z0-9]/g, '');
  }

  const fullUri = `spotify:playlist:${cleanId}`;

  // Special handling for private playlist "Songs" on cloud/Vercel
  if (cleanId === '0ifPH6itv3aMGRMAuiscxP') {
    return res.status(200).json({
      id: fullUri,
      playlistId: cleanId,
      title: 'Songs',
      description: "Imported from Shreeji's Spotify library",
      author: 'Shreeji',
      coverUrl: 'https://i.scdn.co/image/ab67616d0000b27326f7f19c7f0381e56156c94a',
      gradient: '#1e3a8a',
      tracks: SONGS_PLAYLIST_TRACKS
    });
  }

  // 1. Try Spotify Pathfinder API (Works on Vercel and local, pulls 100% of tracks without 100 cap)
  try {
    const pathfinderResult = await fetchPlaylistViaPathfinder(cleanId, fullUri);
    if (pathfinderResult && pathfinderResult.tracks.length > 0) {
      return res.status(200).json(pathfinderResult);
    }
  } catch (err) {
    console.warn('Pathfinder API fetch failed, falling back:', err);
  }

  // 2. Try local desktop CLI if available (when running locally on macOS)
  if (existsSync(CLI_PATH)) {
    try {
      try {
        const { stdout: statusOut } = await execAsync(`"${CLI_PATH}" status`, { timeout: 1500 }).catch(() => ({ stdout: '' }));
        if (!statusOut.includes('is running') && !statusOut.includes('running')) {
          await execAsync(`open -g -a Spotify`, { timeout: 3000 }).catch(() => {});
          for (let i = 0; i < 8; i++) {
            await new Promise(r => setTimeout(r, 300));
            try {
              const { stdout: s } = await execAsync(`"${CLI_PATH}" status`, { timeout: 1000 });
              if (s.includes('is running') || s.includes('running')) break;
            } catch {}
          }
        }
      } catch {}

      const { stdout } = await execAsync(`"${CLI_PATH}" playlist get "${fullUri}" --limit 5000 --format json`, { timeout: 20000 });
      const plData = JSON.parse(stdout);
      if (plData.tracks && plData.tracks.length > 0) {
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

        for (const batch of batches) {
          await Promise.all(batch.map(async (uri: string) => {
            try {
              const trackId = uri.replace('spotify:track:', '');
              const oembedRes = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`);
              if (oembedRes.ok) {
                const data = await oembedRes.json();
                if (data.thumbnail_url) globalCoverCache.set(uri, data.thumbnail_url);
              }
            } catch {}
          }));
        }

        const playlistCover = plData.image_url || plData.coverUrl || globalCoverCache.get(plData.tracks[0]?.uri) || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=300&q=80';

        const tracks = plData.tracks.map((t: any, index: number) => {
          const trackCover = globalCoverCache.get(t.uri) || playlistCover;
          const trackAlbum = globalAlbumCache.get(t.uri) || t.album || plData.name || 'Spotify Playlist';

          return {
            id: t.uri || `spotify:track:${cleanId}-${index}`,
            title: t.name || t.title || 'Unknown Title',
            artist: t.artist || t.artists?.[0]?.name || 'Unknown Artist',
            album: trackAlbum,
            duration: Math.round((t.duration_ms || t.duration || 180000) / 1000),
            coverUrl: trackCover,
            audioUrl: t.preview_url || undefined,
            gradient: '#1e3a8a',
            tempo: 80 + (index % 5) * 4
          };
        });

        return res.status(200).json({
          id: fullUri,
          playlistId: cleanId,
          title: plData.name || 'Untitled Playlist',
          description: plData.description || 'Spotify Playlist',
          author: (cleanId === '5k3iI5fE68jr4UdX2UG6NN' ? 'Shreeji' : 'Spotify'),
          coverUrl: playlistCover,
          gradient: getPlaylistPresetGradient(plData.name || ''),
          tracks
        });
      }
    } catch (cliErr) {
      console.warn('CLI fetch failed:', cliErr);
    }
  }

  // 3. Fallback: Scrape open.spotify.com embed as last resort
  try {
    const spotifyRes = await fetch(`https://open.spotify.com/embed/playlist/${cleanId}`);
    const html = await spotifyRes.text();

    const scriptMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!scriptMatch) {
      return res.status(404).json({ error: 'Could not fetch playlist metadata from Spotify.' });
    }

    const data = JSON.parse(scriptMatch[1]);
    const entity = data.props?.pageProps?.state?.data?.entity;
    if (!entity) {
      return res.status(404).json({ error: 'Playlist entity not found.' });
    }

    const playlistCover = entity.coverArt?.sources?.[0]?.url || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=300&q=80';
    const rawTrackList = entity.trackList || [];

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

    return res.status(200).json({
      id: fullUri,
      playlistId: cleanId,
      title: entity.name || entity.title || 'Untitled Playlist',
      description: entity.subtitle ? `By ${entity.subtitle}` : 'Spotify Playlist',
      author: entity.subtitle || (cleanId === '5k3iI5fE68jr4UdX2UG6NN' ? 'Shreeji' : 'Spotify'),
      coverUrl: playlistCover,
      gradient: getPlaylistPresetGradient(entity.name || entity.title || ''),
      tracks
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch playlist' });
  }
}
