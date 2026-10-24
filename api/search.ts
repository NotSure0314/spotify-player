export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = (req.query?.q || req.query?.query || '') as string;
  if (!query.trim()) {
    return res.status(200).json({ tracks: [] });
  }

  try {
    const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=25`;
    const itunesRes = await fetch(searchUrl);
    const data = await itunesRes.json();

    const tracks = (data.results || []).map((r: any, idx: number) => {
      // High-res album art replace 100x100 with 600x600
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

    return res.status(200).json({ tracks });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Search failed', tracks: [] });
  }
}
