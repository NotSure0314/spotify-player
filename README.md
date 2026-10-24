# Spotify Web Desktop Player Prototype

A functional desktop player application reconstructed based on the Spotify Desktop (`v1.3.6.1921`) reverse engineering teardown.

---

## Architecture Implemented

- **UI & Layout Shell:**
  - **Left Sidebar (`Your Library X`):** Collapsible library, filter pills (Playlists, Artists, Albums), and Liked Songs quick access.
  - **Center View:** Dynamic single-page navigation:
    - **Home View:** Time-aware greeting, 2x3 quick-play cards with hover play buttons, "Made For You" and "Recently Played" horizontal shelves.
    - **Playlist & Album Views:** Dynamic gradient hero banner, track table with `#`, title, artist, album, date added, duration, and hover actions.
    - **Search View:** Real-time search query filtering and vibrant category tiles.
  - **Right Panel:** Synchronized lyrics view with line tracking and queue management.
  - **Bottom Player Bar (`dwp-now-playing-bar`):** Full playback controls (Shuffle, Previous, Play/Pause, Next, Repeat modes), progress scrubber with hover fill, volume control with mute toggle, device popup, and lyrics toggle.

- **Audio Engine:**
  - Self-contained procedural Web Audio engine providing soothing lo-fi synth chord progressions when songs play—works out of the box with zero external audio asset dependencies.
  - Full MediaSession API integration (`navigator.mediaSession`) connecting directly to native macOS media keys and Control Center Now Playing widget.

- **Keyboard Controls:**
  - `Space`: Play / Pause
  - `ArrowRight` / `ArrowLeft`: Seek ±5 seconds
  - `Cmd/Ctrl + ArrowRight`: Next track
  - `Cmd/Ctrl + ArrowLeft`: Previous track
  - `M`: Toggle Mute

---

## Quick Start

```bash
git clone https://github.com/NotSure0314/spotify-player.git
cd spotify-player
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.
