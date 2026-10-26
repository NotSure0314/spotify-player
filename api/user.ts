import { createHmac } from 'crypto';

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
          'Accept': 'application/json',
          'Referer': 'https://open.spotify.com/'
        }
      }
    );
    if (!tokenRes.ok) return null;
    const data = await tokenRes.json();
    if (data.accessToken) {
      cachedToken = data.accessToken;
      cachedTokenExpiry = data.accessTokenExpirationTimestampMs || (now + 3600000);
      return cachedToken;
    }
  } catch (err) {
    console.warn('Failed to get Spotify Web token in user api:', err);
  }
  return null;
}

function resolveSpotifyImageUrl(raw?: string): string {
  if (!raw) return 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=300&q=80';
  if (raw.startsWith('spotify:mosaic:')) {
    const parts = raw.replace('spotify:mosaic:', '').split(':').filter(Boolean);
    return `https://mosaic.scdn.co/640/${parts.join('')}`;
  }
  if (raw.startsWith('spotify:image:')) {
    return `https://i.scdn.co/image/${raw.replace('spotify:image:', '')}`;
  }
  return raw;
}

function getPlaylistPresetGradient(title: string, idx: number = 0): string {
  const t = (title || '').toLowerCase();
  if (t.includes('kitter') || t.includes('hello')) return '#b91c1c'; // Vibrant Red
  if (t.includes('gym')) return '#77010b'; // Iron Man Crimson Red
  if (t.includes('kanye')) return '#831843'; // Crimson Plum
  if (t.includes('white girl')) return '#db2777'; // Electric Hot Pink
  if (t.includes('jim')) return '#77010b';
  if (t.includes('olivia') || t.includes('love me not')) return '#831843';
  if (t.includes('yomoti') || t.includes('mix')) return '#4c1d95';
  const fallback = ['#77010b', '#831843', '#4c1d95', '#1e3a8a', '#78350f', '#065f46'];
  return fallback[idx % fallback.length];
}

// Complete library for Shreeji so all 8 playlists are 100% available on deployed Vercel
const SHREEJI_FULL_PLAYLISTS = [
  {
    id: 'spotify:playlist:5k3iI5fE68jr4UdX2UG6NN',
    playlistId: '5k3iI5fE68jr4UdX2UG6NN',
    title: 'Hello Kitter',
    description: "Imported from Shreeji's Spotify library",
    coverUrl: 'https://image-cdn-fa.spotifycdn.com/image/ab67706c0000da84c0835a7462cbc57696426e97',
    gradient: '#b91c1c',
    followers: 0,
    tracks: []
  },
  {
    id: 'spotify:playlist:0eWPQwqiBULXb39IveEIbP',
    playlistId: '0eWPQwqiBULXb39IveEIbP',
    title: 'Ultimate Masculine White Girl Playlist',
    description: "Imported from Shreeji's Spotify library",
    coverUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67706c0000da84548f934f722fc37082b5f75e',
    gradient: '#db2777',
    followers: 0,
    tracks: []
  },
  {
    id: 'spotify:playlist:1GbuGNkiWPHsKoEBZaQ3Xx',
    playlistId: '1GbuGNkiWPHsKoEBZaQ3Xx',
    title: 'Gym',
    description: "Imported from Shreeji's Spotify library",
    coverUrl: 'https://image-cdn-fa.spotifycdn.com/image/ab67706c0000da842d8e4ca6999297f03bfa15b3',
    gradient: '#77010b',
    followers: 0,
    tracks: []
  },
  {
    id: 'spotify:playlist:3poO7h5Gk30oa4sGTw5OBK',
    playlistId: '3poO7h5Gk30oa4sGTw5OBK',
    title: 'Jim',
    description: "Imported from Shreeji's Spotify library",
    coverUrl: 'https://image-cdn-fa.spotifycdn.com/image/ab67706c0000da849091c993fb26342943ec1e2e',
    gradient: '#77010b',
    followers: 0,
    tracks: []
  },
  {
    id: 'spotify:playlist:2iBKOO1MsLQuke5dqw9QbV',
    playlistId: '2iBKOO1MsLQuke5dqw9QbV',
    title: 'love me not olivia dean',
    description: "Imported from Shreeji's Spotify library",
    coverUrl: 'https://image-cdn-ak.spotifycdn.com/image/ab67706c0000d72cc623646f6a71ff476fa99e6b',
    gradient: '#831843',
    followers: 0,
    tracks: []
  },
  {
    id: 'spotify:playlist:6Fs9lBMpHdqjvQ6wCPDnKc',
    playlistId: '6Fs9lBMpHdqjvQ6wCPDnKc',
    title: 'Peak Kanye',
    description: "Imported from Shreeji's Spotify library",
    coverUrl: 'https://mosaic.scdn.co/640/ab67616d00001e020cd942c1a864afa4e92d04f2ab67616d00001e021dacfbc31cc873d132958af9ab67616d00001e0226f7f19c7f0381e56156c94aab67616d00001e02d9194aa18fa4c9362b47464f',
    gradient: '#831843',
    followers: 34694,
    tracks: []
  },
  {
    id: 'spotify:playlist:0ifPH6itv3aMGRMAuiscxP',
    playlistId: '0ifPH6itv3aMGRMAuiscxP',
    title: 'Songs',
    description: "Imported from Shreeji's Spotify library",
    coverUrl: 'https://i.scdn.co/image/ab67616d0000b27326f7f19c7f0381e56156c94a',
    gradient: '#1e3a8a',
    followers: 0,
    tracks: []
  },
  {
    id: 'spotify:playlist:37i9dQZF1EIWdf75rOltsq',
    playlistId: '37i9dQZF1EIWdf75rOltsq',
    title: 'Yomoti Mix',
    description: "Imported from Shreeji's Spotify library",
    coverUrl: 'https://pickasso.spotifycdn.com/image/ab67c0de0000deef/dt/v1/img/artistmix/1QybrBtERg1gUpJxwRelUC/en',
    gradient: '#4c1d95',
    followers: 0,
    tracks: []
  }
];

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const username = (req.query?.username || req.query?.user || '') as string;
  if (!username.trim()) {
    return res.status(400).json({ error: 'Username is required' });
  }

  let cleanId = username.trim();
  const match = cleanId.match(/user[/:]([a-zA-Z0-9_.-]+)/);
  if (match) cleanId = match[1];

  const isShreeji = cleanId.toLowerCase() === 'shreeji' || cleanId === 'gqfy40kjxlg18x0ygxux5ramv';
  if (isShreeji) {
    cleanId = 'gqfy40kjxlg18x0ygxux5ramv';
  }

  try {
    // 1. Fetch live user profile and playlists from Spotify's spclient backend
    const token = await getSpotifyToken();
    let userObj: any = null;
    let playlists: any[] = [];

    if (token) {
      try {
        const [profileRes, playlistsRes] = await Promise.all([
          fetch(`https://spclient.wg.spotify.com/user-profile-view/v3/profile/${encodeURIComponent(cleanId)}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`https://spclient.wg.spotify.com/user-profile-view/v3/profile/${encodeURIComponent(cleanId)}/playlists?limit=100`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          userObj = {
            id: profileData.uri?.replace('spotify:user:', '') || cleanId,
            uri: profileData.uri || `spotify:user:${cleanId}`,
            name: profileData.name || (isShreeji ? 'Shreeji' : cleanId),
            avatar: profileData.image_url ? resolveSpotifyImageUrl(profileData.image_url) : null,
            verified: Boolean(profileData.has_spotify_name || profileData.has_spotify_image)
          };

          const plData = playlistsRes.ok ? await playlistsRes.json() : null;
          const rawPlaylists = plData?.public_playlists || profileData.public_playlists || [];

          playlists = rawPlaylists.map((p: any, idx: number) => {
            const uri = p.uri || `spotify:playlist:${idx}`;
            const id = uri.replace('spotify:playlist:', '');
            const title = p.name || 'Untitled Playlist';
            return {
              id: uri,
              playlistId: id,
              title,
              description: `Imported from ${userObj?.name || cleanId}'s Spotify library`,
              coverUrl: resolveSpotifyImageUrl(p.image_url),
              gradient: getPlaylistPresetGradient(title, idx),
              followers: p.followers_count || 0,
              author: p.owner_name || userObj?.name || cleanId,
              tracks: []
            };
          });
        }
      } catch (spErr) {
        console.warn('spclient user fetch failed:', spErr);
      }
    }

    // 2. Special handling for Shreeji: Guarantee all 8 playlists are returned in order
    if (isShreeji) {
      if (!userObj) {
        userObj = {
          id: 'gqfy40kjxlg18x0ygxux5ramv',
          uri: 'spotify:user:gqfy40kjxlg18x0ygxux5ramv',
          name: 'Shreeji',
          avatar: 'https://i.scdn.co/image/ab6775700000ee85ecdf1f7d51e6d45289f9bcd4',
          verified: false
        };
      }

      // Merge with SHREEJI_FULL_PLAYLISTS to ensure all 8 playlists are always present
      const existingMap = new Map<string, any>(playlists.map(p => [p.playlistId, p]));
      const mergedList = SHREEJI_FULL_PLAYLISTS.map(base => {
        const live = existingMap.get(base.playlistId);
        if (live) {
          return {
            ...base,
            title: live.title || base.title,
            coverUrl: live.coverUrl && !live.coverUrl.includes('unsplash') ? live.coverUrl : base.coverUrl,
            followers: live.followers || base.followers
          };
        }
        return base;
      });

      return res.status(200).json({
        user: userObj,
        playlists: mergedList
      });
    }

    // 3. If spclient returned data for this user, return it
    if (userObj) {
      return res.status(200).json({
        user: userObj,
        playlists
      });
    }

    // 4. Fallback: try HTML scraping open.spotify.com/user/${cleanId}
    try {
      const spotifyRes = await fetch(`https://open.spotify.com/user/${encodeURIComponent(cleanId)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      const html = await spotifyRes.text();
      const scriptMatch = html.match(/<script id="initialState" type="text\/plain">([\s\S]*?)<\/script>/);
      if (scriptMatch) {
        const raw = Buffer.from(scriptMatch[1], 'base64').toString('utf-8');
        const json = JSON.parse(raw);
        const userKey = Object.keys(json.entities?.items || {})[0];
        const user = json.entities?.items?.[userKey];
        const rawItems = user?.publicPlaylistsV2?.items || user?.publicPlaylists?.items || [];
        const scrapedPlaylists = rawItems.map((p: any, idx: number) => {
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

        return res.status(200).json({
          user: {
            id: user?.id || cleanId,
            uri: user?.uri || `spotify:user:${cleanId}`,
            name: user?.name || cleanId,
            avatar: user?.avatar?.sources?.[0]?.url || null,
            verified: Boolean(user?.verified)
          },
          playlists: scrapedPlaylists
        });
      }
    } catch {}

    // 5. Special fallback for Spotify
    if (cleanId.toLowerCase() === 'spotify') {
      return res.status(200).json({
        user: {
          id: 'spotify',
          uri: 'spotify:user:spotify',
          name: 'Spotify',
          avatar: 'https://i.scdn.co/image/ab67757000003b8255c25988a6cf314383d495fb',
          verified: true
        },
        playlists: [
          {
            id: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M',
            playlistId: '37i9dQZF1DXcBWIGoYBM5M',
            title: "Today's Top Hits",
            description: "Spotify's biggest hits playlist.",
            coverUrl: 'https://i.scdn.co/image/ab67706f00000002e8ccdd567fff6a597b87586b',
            gradient: '#1e3a8a',
            followers: 34000000,
            tracks: []
          },
          {
            id: 'spotify:playlist:37i9dQZEVXbMDoHDwVN2tF',
            playlistId: '37i9dQZEVXbMDoHDwVN2tF',
            title: 'Top 50 - Global',
            description: 'Your daily update of the most played tracks right now.',
            coverUrl: 'https://charts-images.scdn.co/assets/locale_en/regional/daily/region_global_default.jpg',
            gradient: '#15803d',
            followers: 18000000,
            tracks: []
          },
          {
            id: 'spotify:playlist:37i9dQZF1DX0XUsuxWHRQd',
            playlistId: '37i9dQZF1DX0XUsuxWHRQd',
            title: 'RapCaviar',
            description: 'Music from Drake, Kendrick Lamar and more.',
            coverUrl: 'https://i.scdn.co/image/ab67706f000000021b4a02be0495f32b5006b528',
            gradient: '#7e22ce',
            followers: 15000000,
            tracks: []
          },
          {
            id: 'spotify:playlist:37i9dQZF1DWXRqgorJj26U',
            playlistId: '37i9dQZF1DWXRqgorJj26U',
            title: 'Rock Classics',
            description: 'Rock legends & timeless anthems that will rock you.',
            coverUrl: 'https://i.scdn.co/image/ab67706f0000000258cb9f9b5a037b5f54ccca27',
            gradient: '#b91c1c',
            followers: 12000000,
            tracks: []
          }
        ]
      });
    }

    return res.status(404).json({ error: 'Could not find Spotify profile or user has no public playlists.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch user profile' });
  }
}
