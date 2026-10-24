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

  try {
    const coverMap = new Map<string, string>();
    const albumMap = new Map<string, string>();

    // 1. Fetch main playlist page to extract exact album covers and album names from initialState
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

    // 2. Fetch full track list from embed endpoint
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

    // 3. For any tracks missing individual album covers, fetch from oEmbed in parallel
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

    // 4. Assemble complete tracks with exact individual album covers
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

    return res.status(200).json({
      id: entity.uri || `spotify:playlist:${cleanId}`,
      playlistId: cleanId,
      title: entity.name || entity.title || 'Untitled Playlist',
      description: entity.subtitle ? `By ${entity.subtitle}` : 'Spotify Playlist',
      coverUrl: playlistCover,
      gradient: '#4c1d95',
      tracks
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch playlist' });
  }
}
