import { Track } from './types';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

class AudioPlayerEngine {
  private audio: HTMLAudioElement;
  private ytPlayer: any = null;
  private isPlaying: boolean = false;
  private activeMode: 'yt' | 'html5' = 'yt';
  private currentTrack: Track | null = null;
  private volume: number = 0.75;
  private timeTicker: number | null = null;
  private onTimeUpdateCallback: ((current: number, duration: number) => void) | null = null;
  private onTrackEndedCallback: (() => void) | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.volume = this.volume;
    this.audio.preload = 'auto';

    // HTML5 Audio Listeners
    this.audio.addEventListener('timeupdate', () => {
      if (this.activeMode === 'html5' && this.onTimeUpdateCallback && !isNaN(this.audio.currentTime)) {
        const cur = Math.floor(this.audio.currentTime);
        const dur = isNaN(this.audio.duration) || this.audio.duration === 0
          ? (this.currentTrack?.duration || 180)
          : Math.floor(this.audio.duration);
        this.onTimeUpdateCallback(cur, dur);
      }
    });

    this.audio.addEventListener('ended', () => {
      if (this.activeMode === 'html5') {
        this.isPlaying = false;
        if (this.onTrackEndedCallback) this.onTrackEndedCallback();
      }
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('HTML5 audio error:', e);
      if (this.activeMode === 'html5') this.isPlaying = false;
    });

    // Initialize YouTube Iframe Player
    this.initYouTube();
  }

  private initYouTube() {
    const initPlayer = () => {
      if (window.YT && window.YT.Player) {
        try {
          this.ytPlayer = new window.YT.Player('yt-player-container', {
            height: '1',
            width: '1',
            playerVars: {
              autoplay: 1,
              controls: 0,
              disablekb: 1,
              fs: 0,
              rel: 0,
              origin: window.location.origin
            },
            events: {
              onReady: () => {
                this.ytPlayer.setVolume(this.volume * 100);
              },
              onStateChange: (event: any) => {
                // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
                if (event.data === 1) {
                  this.isPlaying = true;
                  this.startTimeTicker();
                } else if (event.data === 2) {
                  this.isPlaying = false;
                  this.stopTimeTicker();
                } else if (event.data === 0) {
                  this.isPlaying = false;
                  this.stopTimeTicker();
                  if (this.onTrackEndedCallback) this.onTrackEndedCallback();
                }
              },
              onError: (err: any) => {
                console.warn('YouTube Player error, falling back to preview:', err);
                this.fallbackToHtml5();
              }
            }
          });
        } catch (e) {
          console.warn('Error creating YT.Player:', e);
        }
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }
  }

  private startTimeTicker() {
    this.stopTimeTicker();
    this.timeTicker = window.setInterval(() => {
      if (this.activeMode === 'yt' && this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
        try {
          const cur = Math.floor(this.ytPlayer.getCurrentTime() || 0);
          const dur = Math.floor(this.ytPlayer.getDuration() || this.currentTrack?.duration || 180);
          if (this.onTimeUpdateCallback) {
            this.onTimeUpdateCallback(cur, dur);
          }
        } catch {}
      }
    }, 500);
  }

  private stopTimeTicker() {
    if (this.timeTicker !== null) {
      clearInterval(this.timeTicker);
      this.timeTicker = null;
    }
  }

  private fallbackToHtml5() {
    this.activeMode = 'html5';
    this.stopTimeTicker();
    if (this.currentTrack?.audioUrl) {
      this.audio.src = this.currentTrack.audioUrl;
      this.audio.currentTime = 0;
      this.audio.play().catch(e => console.warn('Preview fallback failed:', e));
    }
  }

  onTimeUpdate(cb: (current: number, duration: number) => void) {
    this.onTimeUpdateCallback = cb;
  }

  onTrackEnded(cb: () => void) {
    this.onTrackEndedCallback = cb;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    this.audio.volume = this.volume;
    if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
      try {
        this.ytPlayer.setVolume(this.volume * 100);
      } catch {}
    }
  }

  seek(seconds: number) {
    if (this.activeMode === 'yt' && this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
      try {
        this.ytPlayer.seekTo(seconds, true);
      } catch {}
    } else if (this.activeMode === 'html5') {
      this.audio.currentTime = Math.min(this.audio.duration || 180, Math.max(0, seconds));
    }
  }

  async playTrack(track: Track) {
    this.currentTrack = track;
    this.isPlaying = true;

    // Reset any currently playing audio
    this.audio.pause();
    this.audio.currentTime = 0;
    this.stopTimeTicker();

    // Query full song from YouTube so it starts at 0:00
    try {
      const res = await fetch(`/api/yt?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.videoId && this.ytPlayer && typeof this.ytPlayer.loadVideoById === 'function') {
          this.activeMode = 'yt';
          this.ytPlayer.loadVideoById({
            videoId: data.videoId,
            startSeconds: 0
          });
          this.ytPlayer.playVideo();
          return;
        }
      }
    } catch (err) {
      console.warn('YouTube search fetch failed:', err);
    }

    // Fallback to preview audio if YouTube unavailable
    this.fallbackToHtml5();
  }

  pause() {
    this.isPlaying = false;
    this.stopTimeTicker();
    if (this.activeMode === 'yt' && this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      try {
        this.ytPlayer.pauseVideo();
      } catch {}
    } else {
      this.audio.pause();
    }
  }

  resume() {
    this.isPlaying = true;
    if (this.activeMode === 'yt' && this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
      try {
        this.ytPlayer.playVideo();
        this.startTimeTicker();
      } catch {}
    } else if (this.currentTrack?.audioUrl) {
      this.audio.play().catch(() => {});
    }
  }

  stop() {
    this.isPlaying = false;
    this.stopTimeTicker();
    if (this.ytPlayer && typeof this.ytPlayer.stopVideo === 'function') {
      try {
        this.ytPlayer.stopVideo();
      } catch {}
    }
    this.audio.pause();
    this.audio.currentTime = 0;
    this.audio.removeAttribute('src');
    this.currentTrack = null;
  }
}

export const audioEngine = new AudioPlayerEngine();
