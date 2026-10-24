// Web Audio Engine with seamless dual support:
// 1. Real MP3/AAC audio streaming for Spotify previews & catalog tracks
// 2. Procedural Web Audio synth fallback for offline / procedural playback

import { Track } from './types';

class AudioPlayerEngine {
  private audio: HTMLAudioElement;
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private intervalId: number | null = null;
  private noteIndex: number = 0;
  private volume: number = 0.75;
  private masterGain: GainNode | null = null;
  private currentTrack: Track | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.volume = this.volume;

    // Handle audio element events
    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Real audio preview error, falling back to synth engine:', e);
      if (this.isPlaying && this.currentTrack) {
        this.playSynth(this.currentTrack.tempo || 75);
      }
    });
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    this.audio.volume = this.volume;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  seek(seconds: number) {
    if (this.audio.src && !isNaN(this.audio.duration)) {
      this.audio.currentTime = Math.min(this.audio.duration, Math.max(0, seconds));
    }
  }

  playTrack(track: Track) {
    this.currentTrack = track;
    this.isPlaying = true;
    this.stopSynth();

    if (track.audioUrl) {
      this.audio.src = track.audioUrl;
      this.audio.volume = this.volume;
      this.audio.play().catch(err => {
        console.warn('Autoplay blocked or stream error:', err);
        // Fallback to synth if stream fails
        this.playSynth(track.tempo || 75);
      });
    } else {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.playSynth(track.tempo || 75);
    }
  }

  private playSynth(tempo: number = 75) {
    this.initContext();
    this.stopSynth();

    // Pentatonic scale chords for soothing lo-fi harmony
    const chords = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [196.00, 246.94, 293.66, 349.23], // G7
    ];

    const stepTime = (60 / tempo) * 1000;
    this.noteIndex = 0;

    this.intervalId = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx || !this.masterGain) return;

      const chord = chords[Math.floor(this.noteIndex / 4) % chords.length];
      const freq = chord[this.noteIndex % chord.length];

      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);

      const now = this.ctx.currentTime;
      noteGain.gain.setValueAtTime(0.001, now);
      noteGain.gain.exponentialRampToValueAtTime(0.12, now + 0.05);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + (stepTime / 1000) * 1.4);

      osc.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + (stepTime / 1000) * 1.5);

      this.noteIndex++;
    }, stepTime / 2);
  }

  pause() {
    this.isPlaying = false;
    this.audio.pause();
    this.stopSynth();
  }

  resume(track?: Track | null) {
    if (!this.isPlaying) {
      if (track) {
        this.currentTrack = track;
      }
      this.isPlaying = true;

      if (this.currentTrack?.audioUrl && this.audio.src) {
        this.audio.play().catch(() => {
          this.playSynth(this.currentTrack?.tempo || 75);
        });
      } else if (this.currentTrack) {
        this.playSynth(this.currentTrack.tempo || 75);
      }
    }
  }

  stopSynth() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const audioEngine = new AudioPlayerEngine();
