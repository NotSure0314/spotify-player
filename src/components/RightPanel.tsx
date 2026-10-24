import React from 'react';
import { X, Mic2, ListMusic } from 'lucide-react';
import { Track } from '../types';

interface RightPanelProps {
  currentTrack: Track | null;
  isLyricsOpen: boolean;
  onCloseLyrics: () => void;
  isQueueOpen: boolean;
  onCloseQueue: () => void;
  queue: Track[];
  progress: number;
  onPlayTrack: (track: Track) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  currentTrack,
  isLyricsOpen,
  onCloseLyrics,
  isQueueOpen,
  onCloseQueue,
  queue,
  progress,
  onPlayTrack
}) => {
  if (!isLyricsOpen && !isQueueOpen) {
    return null;
  }

  return (
    <aside style={{
      width: 'var(--right-panel-width)',
      height: '100%',
      backgroundColor: 'var(--bg-base)',
      borderRadius: 'var(--panel-radius)',
      margin: '8px 8px 8px 0',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0
    }} className="animate-fade-in">
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700 }}>
          {isLyricsOpen ? (
            <>
              <Mic2 size={18} color="#1ed760" />
              <span>Lyrics</span>
            </>
          ) : (
            <>
              <ListMusic size={18} color="#1ed760" />
              <span>Queue</span>
            </>
          )}
        </div>
        <button
          onClick={isLyricsOpen ? onCloseLyrics : onCloseQueue}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-subdued)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex'
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subdued)')}
        >
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {isLyricsOpen ? (
          <div>
            {currentTrack?.lyrics && currentTrack.lyrics.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {currentTrack.lyrics.map((line, idx) => {
                  // highlight based on progress ratio
                  const activeLineIndex = Math.floor((progress / (currentTrack.duration || 1)) * currentTrack.lyrics!.length);
                  const isCurrentLine = idx === activeLineIndex;

                  return (
                    <p
                      key={idx}
                      style={{
                        fontSize: isCurrentLine ? '20px' : '17px',
                        fontWeight: 700,
                        color: isCurrentLine ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                        lineHeight: 1.4,
                        transition: 'all 0.2s ease',
                        cursor: 'default'
                      }}
                    >
                      {line}
                    </p>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: 'var(--text-subdued)', fontSize: '14px' }}>
                No lyrics available for this song.
              </p>
            )}
          </div>
        ) : (
          <div>
            <span style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', display: 'block' }}>
              Now Playing
            </span>
            {currentTrack && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                marginBottom: '20px'
              }}>
                <img
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  style={{ width: '44px', height: '44px', borderRadius: '4px', objectFit: 'cover' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1ed760', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentTrack.title}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-subdued)' }}>{currentTrack.artist}</span>
                </div>
              </div>
            )}

            <span style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', display: 'block' }}>
              Next from Playlist
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {queue.map(track => (
                <div
                  key={track.id}
                  onClick={() => onPlayTrack(track)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    style={{ width: '38px', height: '38px', borderRadius: '4px', objectFit: 'cover' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {track.title}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-subdued)' }}>{track.artist}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
