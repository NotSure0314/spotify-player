import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Heart,
  Mic2,
  ListMusic,
  Laptop2,
  Maximize2,
  PictureInPicture2
} from 'lucide-react';
import { Track, RepeatMode } from '../types';

interface NowPlayingBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  progress: number;
  duration?: number;
  onSeek: (seconds: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  isShuffle: boolean;
  onToggleShuffle: () => void;
  repeatMode: RepeatMode;
  onCycleRepeat: () => void;
  isLiked: boolean;
  onToggleLike: () => void;
  isLyricsOpen: boolean;
  onToggleLyrics: () => void;
  isQueueOpen: boolean;
  onToggleQueue: () => void;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const NowPlayingBar: React.FC<NowPlayingBarProps> = ({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrevious,
  progress,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  isShuffle,
  onToggleShuffle,
  repeatMode,
  onCycleRepeat,
  isLiked,
  onToggleLike,
  isLyricsOpen,
  onToggleLyrics,
  isQueueOpen,
  onToggleQueue
}) => {
  const [prevVolume, setPrevVolume] = useState<number>(0.75);
  const [devicePopup, setDevicePopup] = useState<boolean>(false);

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      onVolumeChange(0);
    } else {
      onVolumeChange(prevVolume || 0.75);
    }
  };

  const effectiveDuration = (duration && duration > 0) ? duration : (currentTrack ? currentTrack.duration : 180);
  const progressPercent = Math.min(100, Math.max(0, effectiveDuration > 0 ? (progress / effectiveDuration) * 100 : 0));
  const volumePercent = volume * 100;

  return (
    <footer style={{
      height: 'var(--player-height)',
      backgroundColor: '#000000',
      display: 'grid',
      gridTemplateColumns: '30% 40% 30%',
      alignItems: 'center',
      padding: '0 16px',
      zIndex: 100,
      userSelect: 'none',
      flexShrink: 0
    }}>
      {/* 1. Left: Track Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
        {currentTrack ? (
          <>
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '4px',
                objectFit: 'cover',
                flexShrink: 0
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
              <span style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-base)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                cursor: 'pointer'
              }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
              >
                {currentTrack.title}
              </span>
              <span style={{
                fontSize: '11px',
                color: 'var(--text-subdued)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                cursor: 'pointer'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.textDecoration = 'underline';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.textDecoration = 'none';
                e.currentTarget.style.color = 'var(--text-subdued)';
              }}
              >
                {currentTrack.artist}
              </span>
            </div>

            <button
              onClick={onToggleLike}
              title={isLiked ? 'Remove from Your Library' : 'Save to Your Library'}
              style={{
                background: 'none',
                border: 'none',
                color: isLiked ? '#1ed760' : 'var(--text-subdued)',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0
              }}
              onMouseEnter={e => {
                if (!isLiked) e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={e => {
                if (!isLiked) e.currentTarget.style.color = 'var(--text-subdued)';
              }}
            >
              <Heart size={16} fill={isLiked ? '#1ed760' : 'none'} strokeWidth={isLiked ? 0 : 2} />
            </button>

            <button
              title="Picture in picture"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-subdued)',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subdued)')}
            >
              <PictureInPicture2 size={16} />
            </button>
          </>
        ) : null}
      </div>

      {/* 2. Center: Controls & Scrubber */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
        {/* Buttons Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
          {/* Shuffle */}
          <button
            onClick={onToggleShuffle}
            title={isShuffle ? 'Disable shuffle' : 'Enable shuffle'}
            style={{
              background: 'none',
              border: 'none',
              color: isShuffle ? '#1ed760' : 'var(--text-subdued)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative'
            }}
            onMouseEnter={e => {
              if (!isShuffle) e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={e => {
              if (!isShuffle) e.currentTarget.style.color = 'var(--text-subdued)';
            }}
          >
            <Shuffle size={16} />
            {isShuffle && (
              <span style={{
                width: '4px',
                height: '4px',
                backgroundColor: '#1ed760',
                borderRadius: '50%',
                position: 'absolute',
                bottom: '-6px'
              }} />
            )}
          </button>

          {/* Previous */}
          <button
            onClick={onPrevious}
            title="Previous"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-subdued)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subdued)')}
          >
            <SkipBack size={18} fill="currentColor" />
          </button>

          {/* Play / Pause Toggle Button */}
          <button
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              border: 'none',
              color: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'transform 0.1s ease'
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {isPlaying ? (
              <Pause size={16} fill="#000000" color="#000000" />
            ) : (
              <Play size={16} fill="#000000" color="#000000" style={{ marginLeft: '2px' }} />
            )}
          </button>

          {/* Next */}
          <button
            onClick={onNext}
            title="Next"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-subdued)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subdued)')}
          >
            <SkipForward size={18} fill="currentColor" />
          </button>

          {/* Repeat */}
          <button
            onClick={onCycleRepeat}
            title={`Repeat: ${repeatMode}`}
            style={{
              background: 'none',
              border: 'none',
              color: repeatMode !== 'off' ? '#1ed760' : 'var(--text-subdued)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative'
            }}
            onMouseEnter={e => {
              if (repeatMode === 'off') e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={e => {
              if (repeatMode === 'off') e.currentTarget.style.color = 'var(--text-subdued)';
            }}
          >
            {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
            {repeatMode !== 'off' && (
              <span style={{
                width: '4px',
                height: '4px',
                backgroundColor: '#1ed760',
                borderRadius: '50%',
                position: 'absolute',
                bottom: '-6px'
              }} />
            )}
          </button>
        </div>

        {/* Progress Bar Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '520px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-subdued)', minWidth: '32px', textAlign: 'right' }}>
            {formatTime(progress)}
          </span>

          <div
            className="scrubber-wrap"
            style={{
              flex: 1,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer'
            }}
          >
            <div style={{
              position: 'absolute',
              height: '4px',
              borderRadius: '2px',
              backgroundColor: '#4d4d4d',
              width: '100%',
              zIndex: 1,
              pointerEvents: 'none'
            }}>
              <div
                className="scrubber-fill"
                style={{
                  height: '100%',
                  borderRadius: '2px',
                  backgroundColor: '#ffffff',
                  width: `${progressPercent}%`,
                  transition: 'background-color 0.15s ease'
                }}
              />
            </div>

            <input
              type="range"
              className="spotify-slider"
              min={0}
              max={effectiveDuration || 100}
              value={Math.min(progress, effectiveDuration)}
              onChange={e => onSeek(Number(e.target.value))}
              style={{
                zIndex: 2,
                opacity: 0,
                cursor: 'pointer'
              }}
            />
          </div>

          <span style={{ fontSize: '11px', color: 'var(--text-subdued)', minWidth: '32px' }}>
            {formatTime(effectiveDuration)}
          </span>
        </div>
      </div>

      {/* 3. Right: Device, Volume & View Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '14px', position: 'relative' }}>
        {/* Lyrics */}
        <button
          onClick={onToggleLyrics}
          title="Lyrics"
          style={{
            background: 'none',
            border: 'none',
            color: isLyricsOpen ? '#1ed760' : 'var(--text-subdued)',
            cursor: 'pointer',
            padding: 0
          }}
          onMouseEnter={e => {
            if (!isLyricsOpen) e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={e => {
            if (!isLyricsOpen) e.currentTarget.style.color = 'var(--text-subdued)';
          }}
        >
          <Mic2 size={16} />
        </button>

        {/* Queue */}
        <button
          onClick={onToggleQueue}
          title="Queue"
          style={{
            background: 'none',
            border: 'none',
            color: isQueueOpen ? '#1ed760' : 'var(--text-subdued)',
            cursor: 'pointer',
            padding: 0
          }}
          onMouseEnter={e => {
            if (!isQueueOpen) e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={e => {
            if (!isQueueOpen) e.currentTarget.style.color = 'var(--text-subdued)';
          }}
        >
          <ListMusic size={16} />
        </button>

        {/* Connect to a Device */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDevicePopup(!devicePopup)}
            title="Connect to a device"
            style={{
              background: 'none',
              border: 'none',
              color: '#1ed760',
              cursor: 'pointer',
              padding: 0,
              display: 'flex'
            }}
          >
            <Laptop2 size={16} />
          </button>

          {devicePopup && (
            <div style={{
              position: 'absolute',
              bottom: '36px',
              right: '0',
              width: '260px',
              backgroundColor: '#282828',
              borderRadius: '8px',
              padding: '16px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              zIndex: 200,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>Connect to a device</span>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(30, 215, 96, 0.15)',
                color: '#1ed760'
              }}>
                <Laptop2 size={22} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>This Computer</span>
                  <span style={{ fontSize: '11px', color: '#1ed760' }}>Listening on Spotify Web Desktop</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Volume Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '120px' }}>
          <button
            onClick={toggleMute}
            title={volume === 0 ? 'Unmute' : 'Mute'}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-subdued)',
              cursor: 'pointer',
              padding: 0,
              display: 'flex'
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subdued)')}
          >
            {volume === 0 ? <VolumeX size={16} /> : volume < 0.5 ? <Volume1 size={16} /> : <Volume2 size={16} />}
          </button>

          <div
            className="scrubber-wrap"
            style={{
              flex: 1,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer'
            }}
          >
            <div style={{
              position: 'absolute',
              height: '4px',
              borderRadius: '2px',
              backgroundColor: '#4d4d4d',
              width: '100%',
              zIndex: 1,
              pointerEvents: 'none'
            }}>
              <div
                className="scrubber-fill"
                style={{
                  height: '100%',
                  borderRadius: '2px',
                  backgroundColor: '#ffffff',
                  width: `${volumePercent}%`,
                  transition: 'background-color 0.15s ease'
                }}
              />
            </div>

            <input
              type="range"
              className="spotify-slider"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={e => onVolumeChange(Number(e.target.value))}
              style={{
                zIndex: 2,
                opacity: 0,
                cursor: 'pointer'
              }}
            />
          </div>
        </div>

        {/* Fullscreen Icon */}
        <button
          title="Full screen"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-subdued)',
            cursor: 'pointer',
            padding: 0
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subdued)')}
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </footer>
  );
};
