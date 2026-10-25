export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const title = (req.query?.title || req.query?.q || '') as string;
  const artist = (req.query?.artist || '') as string;

  if (!title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const query = `${title} ${artist} audio`.trim();

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const ytRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    const html = await ytRes.text();

    const videoIdMatch = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/) || html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (!videoIdMatch) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const videoId = videoIdMatch[1];
    return res.status(200).json({ videoId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to search YouTube' });
  }
}
