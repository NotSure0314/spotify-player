const colorCache = new Map<string, string>();

export function getFallbackPlaylistColor(title: string, _coverUrl: string = ''): string {
  const t = (title || '').toLowerCase();
  if (t.includes('kitter') || t.includes('hello')) return '#b91c1c'; // Hello Kitty Vibrant Red
  if (t.includes('gym')) return '#77010b'; // Iron Man Crimson Red
  if (t.includes('kanye')) return '#831843'; // Crimson Plum / MBDTF Burgundy
  if (t.includes('white girl')) return '#db2777'; // Electric Hot Pink
  if (t.includes('drake')) return '#312e81'; // Deep Indigo
  if (t.includes('lofi') || t.includes('chill')) return '#4c1d95'; // Violet / Purple
  if (t.includes('rock')) return '#7f1d1d'; // Crimson
  if (t.includes('pop')) return '#065f46'; // Forest Emerald
  if (t.includes('rap') || t.includes('hip-hop')) return '#831843';

  // Deterministic fallback based on title characters
  const defaultColors = [
    '#77010b', // Crimson
    '#831843', // Plum
    '#4c1d95', // Purple
    '#1e3a8a', // Deep Blue
    '#065f46', // Emerald
    '#78350f', // Amber / Brown
    '#701a75'  // Fuchsia
  ];
  let hash = 0;
  for (let i = 0; i < t.length; i++) {
    hash = (hash << 5) - hash + t.charCodeAt(i);
  }
  return defaultColors[Math.abs(hash) % defaultColors.length];
}

export function extractDominantColor(imageUrl: string, titleFallback: string = ''): Promise<string> {
  if (!imageUrl) {
    return Promise.resolve(getFallbackPlaylistColor(titleFallback));
  }

  if (colorCache.has(imageUrl)) {
    return Promise.resolve(colorCache.get(imageUrl)!);
  }

  // Check localStorage cache
  try {
    const cached = localStorage.getItem(`pl_color_${imageUrl}`);
    if (cached) {
      colorCache.set(imageUrl, cached);
      return Promise.resolve(cached);
    }
  } catch {}

  return new Promise((resolve) => {
    const fallback = getFallbackPlaylistColor(titleFallback, imageUrl);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      resolve(fallback);
    }, 1500);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(fallback);

        canvas.width = 32;
        canvas.height = 32;
        ctx.drawImage(img, 0, 0, 32, 32);
        const data = ctx.getImageData(0, 0, 32, 32).data;

        let maxScore = -1;
        let bestColor = [119, 1, 11];

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          const brightness = (r + g + b) / 3;

          // Skip very dark or almost pure white pixels
          if (brightness < 20 || brightness > 245) continue;

          // Saturation
          const saturation = max === 0 ? 0 : delta / max;
          // Score prioritizes vivid, rich, saturated colors
          const score = saturation * 2.5 + (brightness > 35 && brightness < 195 ? 1 : 0.3);

          if (score > maxScore) {
            maxScore = score;
            bestColor = [r, g, b];
          }
        }

        const hex = '#' + bestColor.map(c => c.toString(16).padStart(2, '0')).join('');
        colorCache.set(imageUrl, hex);
        try {
          localStorage.setItem(`pl_color_${imageUrl}`, hex);
        } catch {}
        resolve(hex);
      } catch {
        resolve(fallback);
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve(fallback);
    };

    img.src = imageUrl;
  });
}
