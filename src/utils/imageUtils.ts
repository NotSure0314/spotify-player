export function getHighResImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  return url
    .replace('ab67616d00004851', 'ab67616d0000b273') // Spotify Track 64x64 -> 640x640
    .replace('ab67616d00001e02', 'ab67616d0000b273') // Spotify Track 300x300 -> 640x640
    .replace('ab67706f00000002', 'ab67706f00000003') // Spotify Playlist 300x300 -> 640x640
    .replace('100x100bb.jpg', '640x640bb.jpg')       // Apple Music 100x100 -> 640x640
    .replace('60x60bb.jpg', '640x640bb.jpg')         // Apple Music 60x60 -> 640x640
    .replace('300x300bb.jpg', '640x640bb.jpg');      // Apple Music 300x300 -> 640x640
}
