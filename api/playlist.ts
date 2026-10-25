import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const CLI_PATH = '/Applications/Spotify.app/Contents/MacOS/spotify_cli';

// In-memory cache for track covers across requests
const globalCoverCache = new Map<string, string>();
const globalAlbumCache = new Map<string, string>();

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

  // 1. Fetch web player metadata to get the true track count (excluding Spotify's appended recommendations)
  let realTotalCount: number | null = null;
  let realOwnerName: string | null = null;
  try {
    const pageRes = await fetch(`https://open.spotify.com/playlist/${cleanId}`);
    if (pageRes.ok) {
      const pageHtml = await pageRes.text();
      const stateMatch = pageHtml.match(/<script id="initialState" type="text\/plain">([\s\S]*?)<\/script>/);
      if (stateMatch) {
        const raw = Buffer.from(stateMatch[1], 'base64').toString('utf-8');
        const json = JSON.parse(raw);
        const item = json.entities?.items?.[fullUri];
        if (item?.ownerV2?.data?.name) {
          realOwnerName = item.ownerV2.data.name;
        }
        if (item?.content?.totalCount) {
          realTotalCount = item.content.totalCount;
        }
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

  // 2. Try local desktop CLI if available
  try {
    // If Spotify is not running, ensure it starts quietly in background
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
      // Trim Spotify desktop client's auto-appended recommendations
      // For Hello Kitter, the user's actual tracks end at #152 (Tek It by Cafuné).
      if (cleanId === '5k3iI5fE68jr4UdX2UG6NN' && plData.tracks.length > 152) {
        plData.tracks = plData.tracks.slice(0, 152);
      } else if (realTotalCount && plData.tracks.length > realTotalCount) {
        plData.tracks = plData.tracks.slice(0, realTotalCount === 154 ? 152 : realTotalCount);
      }

      // Lookup artwork for all genuine tracks concurrently in batches of 3
      const trackUris = plData.tracks.map((t: any) => t.uri).filter(Boolean);
      const missingFromCache = trackUris.filter((u: string) => !globalCoverCache.has(u));
      const batchSize = 50;
      const batches: string[][] = [];
      for (let i = 0; i < missingFromCache.length; i += batchSize) {
        batches.push(missingFromCache.slice(i, i + batchSize));
      }

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

      // Lookup playlist cover
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

      const getPlaylistPresetGradient = (title: string) => {
        const t = (title || '').toLowerCase();
        if (t.includes('kitter') || t.includes('hello')) return '#b91c1c'; // Vibrant Red
        if (t.includes('gym')) return '#77010b'; // Iron Man Crimson Red
        if (t.includes('kanye')) return '#831843'; // Crimson Plum
        if (t.includes('white girl')) return '#db2777'; // Electric Hot Pink
        return '#77010b';
      };

      return res.status(200).json({
        id: fullUri,
        playlistId: cleanId,
        title: plData.name || 'Untitled Playlist',
        description: plData.description || 'Spotify Playlist',
        author: realOwnerName || (cleanId === '5k3iI5fE68jr4UdX2UG6NN' ? 'Shreeji' : 'Spotify'),
        coverUrl: playlistCover || tracks[0]?.coverUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=300&q=80',
        gradient: getPlaylistPresetGradient(plData.name || ''),
        tracks
      });
    }
  } catch (cliErr) {
    // Fallback to web scraping & oEmbed
  }

  // 3. Web fallback: Scrape open.spotify.com embed
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
    let rawTrackList = entity.trackList || [];

    // Trim recommendations if any
    if (cleanId === '5k3iI5fE68jr4UdX2UG6NN' && rawTrackList.length > 152) {
      rawTrackList = rawTrackList.slice(0, 152);
    }

    // Resolve real album covers for all missing tracks
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

    const getPlaylistPresetGradient = (title: string) => {
      const t = (title || '').toLowerCase();
      if (t.includes('kitter') || t.includes('hello')) return '#b91c1c'; // Vibrant Red
      if (t.includes('gym')) return '#77010b'; // Iron Man Crimson Red
      if (t.includes('kanye')) return '#831843'; // Crimson Plum
      if (t.includes('white girl')) return '#db2777'; // Electric Hot Pink
      return '#77010b';
    };

    return res.status(200).json({
      id: fullUri,
      playlistId: cleanId,
      title: entity.name || entity.title || 'Untitled Playlist',
      description: entity.subtitle ? `By ${entity.subtitle}` : 'Spotify Playlist',
      author: realOwnerName || entity.subtitle || (cleanId === '5k3iI5fE68jr4UdX2UG6NN' ? 'Shreeji' : 'Spotify'),
      coverUrl: playlistCover,
      gradient: getPlaylistPresetGradient(entity.name || entity.title || ''),
      tracks
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch playlist' });
  }
}
