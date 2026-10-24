// Dedicated Audio Engine: 100% pure audio streaming with zero synthetic sound generators
import { Track } from './types';

class AudioPlayerEngine {
  private audio: HTMLAudioElement;
  private isPlaying: boolean = false;
  private currentTrack: Track | null = null;
  private onTimeUpdateCallback: ((current: number, duration: number) => void) | null = null;
  private onTrackEndedCallback: (() => void) | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.volume = 0.75;
    this.audio.preload = 'auto';

    this.audio.addEventListener('timeupdate', () => {
      if (this.onTimeUpdateCallback && !isNaN(this.audio.currentTime)) {
        const cur = Math.floor(this.audio.currentTime);
        const dur = isNaN(this.audio.duration) || this.audio.duration === 0
          ? (this.currentTrack?.duration || 30)
          : Math.floor(this.audio.duration);
        this.onTimeUpdateCallback(cur, dur);
      }
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      if (this.onTrackEndedCallback) {
        this.onTrackEndedCallback();
      }
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Audio stream playback error:', e);
      this.isPlaying = false;
    });
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  onTimeUpdate(cb: (current: number, duration: number) => void) {
    this.onTimeUpdateCallback = cb;
  }

  onTrackEnded(cb: () => void) {
    this.onTrackEndedCallback = cb;
  }

  setVolume(val: number) {
    const clamped = Math.max(0, Math.min(1, val));
    this.audio.volume = clamped;
  }

  seek(seconds: number) {
    if (!isNaN(this.audio.duration) && this.audio.duration > 0) {
      this.audio.currentTime = Math.min(this.audio.duration, Math.max(0, seconds));
    }
  }

  playTrack(track: Track) {
    this.currentTrack = track;
    this.isPlaying = true;

    // Immediately stop any currently playing audio
    this.audio.pause();
    this.audio.currentTime = 0;

    if (track.audioUrl) {
      this.audio.src = track.audioUrl;
      this.audio.currentTime = 0;
      this.audio.play().catch(err => {
        console.warn('Autoplay failed or preview stream unreachable:', err);
      });
    } else {
      this.audio.removeAttribute('src');
    }
  }

  pause() {
    this.isPlaying = false;
    this.audio.pause();
  }

  resume() {
    if (this.currentTrack?.audioUrl) {
      this.isPlaying = true;
      this.audio.play().catch(err => {
        console.warn('Resume play error:', err);
      });
    }
  }

  stop() {
    this.isPlaying = false;
    this.audio.pause();
    this.audio.currentTime = 0;
    this.audio.removeAttribute('src');
    this.currentTrack = null;
  }
}

export const audioEngine = new AudioPlayerEngine();
