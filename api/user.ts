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

  try {
    const spotifyRes = await fetch(`https://open.spotify.com/user/${encodeURIComponent(cleanId)}`);
    const html = await spotifyRes.text();

    const scriptMatch = html.match(/<script id="initialState" type="text\/plain">([\s\S]*?)<\/script>/);
    if (!scriptMatch) {
      return res.status(404).json({ error: 'Could not find Spotify profile or user has no public playlists.' });
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

    return res.status(200).json({
      user: {
        id: user?.id || cleanId,
        uri: user?.uri || `spotify:user:${cleanId}`,
        name: user?.name || cleanId,
        avatar: user?.avatar?.sources?.[0]?.url || null,
        verified: Boolean(user?.verified)
      },
      playlists
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch user profile' });
  }
}
