import React, { useState } from 'react';
import {
  X,
  Mic2,
  ListMusic,
  MoreHorizontal,
  CheckCircle2,
  PlusCircle,
  Share2,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import { Track } from '../types';
import { getArtistProfile } from '../utils/artistData';
import { getTrackLyrics } from '../utils/lyricsData';
import { getHighResImageUrl } from '../utils/imageUtils';
import { SpotifyPlayIcon } from './SpotifyIcons';

interface RightPanelProps {
  currentTrack: Track | null;
  currentPlaylistTitle?: string;
  isOpen: boolean;
  activeTab: 'nowPlaying' | 'lyrics' | 'queue';
  onClose: () => void;
  onSelectTab: (tab: 'nowPlaying' | 'lyrics' | 'queue') => void;
  queue: Track[];
  progress: number;
  onPlayTrack: (track: Track, contextTracks?: Track[], playlistInfo?: { id: string; title: string }, preserveQueue?: boolean) => void;
  isLiked?: boolean;
  onToggleLike?: () => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  currentTrack,
  currentPlaylistTitle,
  isOpen,
  activeTab,
  onClose,
  onSelectTab,
  queue,
  progress,
  onPlayTrack,
  isLiked = false,
  onToggleLike
}) => {
  const [isFollowing, setIsFollowing] = useState<boolean>(false);

  if (!isOpen) {
    return null;
  }

  const artistProfile = currentTrack
    ? getArtistProfile(currentTrack.artist, currentTrack.title, currentTrack.coverUrl)
    : null;

  const nextTrack = queue && queue.length > 0 ? queue[0] : null;

  // Dynamically compute synced lyrics for this track based on current playback progress
  const trackLyrics = getTrackLyrics(currentTrack);
  const totalDuration = currentTrack?.duration || 180;
  const activeLineIndex = trackLyrics.length > 0
    ? Math.min(trackLyrics.length - 1, Math.max(0, Math.floor((progress / totalDuration) * trackLyrics.length)))
    : 0;

  const currentLyricLine = trackLyrics[activeLineIndex] || '...';
  const nextLyricLine = trackLyrics[activeLineIndex + 1] || trackLyrics[activeLineIndex];

  return (
    <aside
      style={{
        width: 'var(--right-panel-width)',
        height: '100%',
        backgroundColor: 'var(--background-base, #121212)',
        borderRadius: 'var(--panel-radius, 8px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
        transition: 'width 0.2s cubic-bezier(0.3, 0, 0, 1)'
      }}
      className="animate-fade-in"
    >
      {/* 1. Header */}
      <div style={{
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: activeTab !== 'nowPlaying' ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
        flexShrink: 0
      }}>
        {activeTab === 'nowPlaying' ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '15px',
            overflow: 'hidden'
          }}>
            {/* Spotify Sidebar / context icon */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0, opacity: 0.85 }}>
              <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h11A1.5 1.5 0 0 1 15 2.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 13.5v-11zM2.5 2a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h8V2h-8zm9.5 0v12h1.5a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5H12z" />
            </svg>
            <span style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              cursor: 'pointer'
            }}>
              {currentPlaylistTitle || 'Now Playing'}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700 }}>
            <button
              onClick={() => onSelectTab('nowPlaying')}
              title="Back to Now Playing"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-subdued)',
                cursor: 'pointer',
                display: 'flex',
                padding: '2px',
                marginRight: '4px'
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subdued)')}
            >
              <ArrowLeft size={16} />
            </button>
            {activeTab === 'lyrics' ? (
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
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeTab === 'nowPlaying' && (
            <button
              title="More options"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-subdued)',
                cursor: 'pointer',
                display: 'flex',
                padding: '4px'
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subdued)')}
            >
              <MoreHorizontal size={18} />
            </button>
          )}
          <button
            onClick={onClose}
            title="Close"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-subdued)',
              cursor: 'pointer',
              display: 'flex',
              padding: '4px'
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subdued)')}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 2. Scrollable Body Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* VIEW A: NOW PLAYING VIEW */}
        {activeTab === 'nowPlaying' && (
          <>
            {currentTrack ? (
              <>
                {/* Large Canvas Artwork (Zoomed Album Cover matching original Spotify dimensions) */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '3 / 4',
                  minHeight: '260px',
                  maxHeight: '440px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  backgroundColor: '#181818',
                  flexShrink: 0
                }}>
                  <img
                    src={getHighResImageUrl(currentTrack.coverUrl)}
                    alt={currentTrack.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: 'scale(1.06)'
                    }}
                  />
                  {/* Switch to video badge button */}
                  <button
                    style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '12px',
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      borderRadius: '500px',
                      padding: '6px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      backdropFilter: 'blur(8px)',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.85)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)')}
                  >
                    <SpotifyPlayIcon size={12} fill="#ffffff" />
                    <span>Switch to video</span>
                  </button>
                </div>

                {/* Title, Artist & Actions */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '-4px',
                  marginBottom: '4px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingRight: '8px' }}>
                    <span style={{
                      fontSize: '22px',
                      fontWeight: 700,
                      color: '#ffffff',
                      letterSpacing: '-0.5px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {currentTrack.title}
                    </span>
                    <span style={{
                      fontSize: '14px',
                      color: 'var(--text-subdued)',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: '2px'
                    }}>
                      {currentTrack.artist}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <button
                      title="Share"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-subdued)',
                        cursor: 'pointer',
                        display: 'flex',
                        padding: '4px'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subdued)')}
                    >
                      <Share2 size={18} />
                    </button>
                    <button
                      onClick={onToggleLike}
                      title={isLiked ? 'Remove from Your Library' : 'Save to Your Library'}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        padding: '4px'
                      }}
                    >
                      {isLiked ? (
                        <CheckCircle2 size={22} fill="#1ed760" color="#121212" />
                      ) : (
                        <PlusCircle size={22} color="var(--text-subdued)" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Lyrics Preview Card (Dynamic synced lyrics with Expand button) */}
                <div
                  onClick={() => onSelectTab('lyrics')}
                  style={{
                    backgroundColor: '#4a0b12',
                    borderRadius: '12px',
                    padding: '18px 20px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    transition: 'transform 0.15s ease, filter 0.15s ease'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.12)')}
                  onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.8)' }}>
                      Lyrics preview
                    </span>
                    <span
                      onClick={e => {
                        e.stopPropagation();
                        onSelectTab('lyrics');
                      }}
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'rgba(255, 255, 255, 0.75)',
                        backgroundColor: 'rgba(255, 255, 255, 0.12)',
                        borderRadius: '500px',
                        padding: '3px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        transition: 'color 0.15s ease, background-color 0.15s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = '#ffffff';
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)';
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
                      }}
                    >
                      Expand ↗
                    </span>
                  </div>
                  <p style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#ffffff',
                    lineHeight: 1.35,
                    margin: '2px 0 0 0',
                    transition: 'color 0.2s ease'
                  }}>
                    {currentLyricLine}
                  </p>
                  <p style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.5)',
                    lineHeight: 1.35,
                    margin: 0,
                    transition: 'color 0.2s ease'
                  }}>
                    {nextLyricLine}
                  </p>
                </div>

                {/* Related Music Videos */}
                {artistProfile && artistProfile.videos.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
                      Related music videos
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {artistProfile.videos.map((vid, idx) => (
                        <div
                          key={idx}
                          style={{ display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer' }}
                        >
                          <div style={{
                            position: 'relative',
                            width: '100%',
                            aspectRatio: '16 / 9',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            backgroundColor: '#282828'
                          }}>
                            <img
                              src={vid.image}
                              alt={vid.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(0, 0, 0, 0.7)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <SpotifyPlayIcon size={14} fill="#ffffff" />
                            </div>
                          </div>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#ffffff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {vid.title}
                          </span>
                          <span style={{
                            fontSize: '12px',
                            color: 'var(--text-subdued)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {artistProfile.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* About the Artist Card */}
                {artistProfile && (
                  <div style={{
                    backgroundColor: '#1f1f1f',
                    borderRadius: '10px',
                    overflow: 'hidden'
                  }}>
                    {/* Banner Photo (Uses album cover zoomed in) */}
                    <div style={{ position: 'relative', width: '100%', height: '180px' }}>
                      <img
                        src={getHighResImageUrl(currentTrack.coverUrl || artistProfile.image)}
                        alt={artistProfile.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <span style={{
                        position: 'absolute',
                        top: '12px',
                        left: '14px',
                        fontSize: '15px',
                        fontWeight: 700,
                        color: '#ffffff',
                        textShadow: '0 2px 6px rgba(0,0,0,0.8)'
                      }}>
                        About the artist
                      </span>
                    </div>

                    <div style={{ padding: '16px' }}>
                      {/* Name & verified badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
                          {artistProfile.name}
                        </span>
                        <span style={{
                          backgroundColor: '#3d91f4',
                          color: '#ffffff',
                          borderRadius: '50%',
                          width: '15px',
                          height: '15px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 900
                        }}>
                          ✓
                        </span>
                      </div>

                      {/* Listener count & Follow button */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '6px',
                        marginBottom: '12px'
                      }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-subdued)' }}>
                          {artistProfile.monthlyListeners}
                        </span>
                        <button
                          onClick={() => setIsFollowing(prev => !prev)}
                          style={{
                            backgroundColor: 'transparent',
                            border: isFollowing ? '1px solid #1ed760' : '1px solid rgba(255, 255, 255, 0.4)',
                            color: isFollowing ? '#1ed760' : '#ffffff',
                            borderRadius: '500px',
                            padding: '5px 16px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                      </div>

                      {/* Bio */}
                      <p style={{
                        fontSize: '13px',
                        color: 'var(--text-subdued)',
                        lineHeight: 1.45,
                        margin: 0
                      }}>
                        {artistProfile.bio}
                      </p>
                    </div>
                  </div>
                )}

                {/* Credits Card */}
                {artistProfile && artistProfile.credits.length > 0 && (
                  <div style={{
                    backgroundColor: '#1f1f1f',
                    borderRadius: '10px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>Credits</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-subdued)', cursor: 'pointer' }}>
                        Show all
                      </span>
                    </div>

                    {artistProfile.credits.map((c, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {c.name}
                            {c.hasLink && <ExternalLink size={12} color="var(--text-subdued)" />}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-subdued)', marginTop: '2px' }}>
                            {c.role}
                          </span>
                        </div>
                        {idx === 0 && (
                          <button
                            onClick={() => setIsFollowing(prev => !prev)}
                            style={{
                              backgroundColor: 'transparent',
                              border: isFollowing ? '1px solid #1ed760' : '1px solid rgba(255, 255, 255, 0.4)',
                              color: isFollowing ? '#1ed760' : '#ffffff',
                              borderRadius: '500px',
                              padding: '4px 14px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {isFollowing ? 'Following' : 'Follow'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* On Tour Card */}
                {artistProfile && artistProfile.tour.length > 0 && (
                  <div style={{
                    backgroundColor: '#1f1f1f',
                    borderRadius: '10px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>On tour</span>
                    {artistProfile.tour.map((t, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {/* Date badge */}
                        <div style={{
                          backgroundColor: '#121212',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          minWidth: '50px'
                        }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-subdued)', textTransform: 'uppercase' }}>
                            {t.month}
                          </span>
                          <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                            {t.day}
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                            {t.city}
                          </span>
                          <span style={{
                            fontSize: '12px',
                            color: 'var(--text-subdued)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {t.event}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            color: 'var(--text-subdued)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginTop: '1px'
                          }}>
                            {t.venue}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Merch Card */}
                {artistProfile && artistProfile.merch.length > 0 && (
                  <div style={{
                    backgroundColor: '#1f1f1f',
                    borderRadius: '10px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>Merch</span>
                    {artistProfile.merch.map((m, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}>
                        <img
                          src={m.image}
                          alt={m.name}
                          style={{ width: '48px', height: '48px', borderRadius: '4px', objectFit: 'cover' }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
                          {m.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Next in Queue Card */}
                {nextTrack && (
                  <div style={{
                    backgroundColor: '#1f1f1f',
                    borderRadius: '10px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>Next in queue</span>
                      <span
                        onClick={() => onSelectTab('queue')}
                        style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-subdued)', cursor: 'pointer' }}
                      >
                        Open queue
                      </span>
                    </div>
                    <div
                      onClick={() => onPlayTrack(nextTrack, undefined, undefined, true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px'
                      }}
                    >
                      <img
                        src={getHighResImageUrl(nextTrack.coverUrl)}
                        alt={nextTrack.title}
                        style={{ width: '44px', height: '44px', borderRadius: '4px', objectFit: 'cover' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#ffffff',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {nextTrack.title}
                        </span>
                        <span style={{
                          fontSize: '12px',
                          color: 'var(--text-subdued)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {nextTrack.artist}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-subdued)' }}>
                <p style={{ fontSize: '14px' }}>Play a track to view song information and artist details.</p>
              </div>
            )}
          </>
        )}

        {/* VIEW B: FULL LYRICS */}
        {activeTab === 'lyrics' && (
          <div>
            {trackLyrics && trackLyrics.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {trackLyrics.map((line, idx) => {
                  const isCurrentLine = idx === activeLineIndex;

                  return (
                    <p
                      key={idx}
                      style={{
                        fontSize: isCurrentLine ? '22px' : '17px',
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
        )}

        {/* VIEW C: FULL QUEUE */}
        {activeTab === 'queue' && (
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
                  src={getHighResImageUrl(currentTrack.coverUrl)}
                  alt={currentTrack.title}
                  style={{ width: '44px', height: '44px', borderRadius: '4px', objectFit: 'cover' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#1ed760',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {currentTrack.title}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-subdued)' }}>
                    {currentTrack.artist}
                  </span>
                </div>
              </div>
            )}

            <span style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', display: 'block' }}>
              Next in Queue
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {queue.map(track => (
                <div
                  key={track.id}
                  onClick={() => onPlayTrack(track, undefined, undefined, true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <img
                    src={getHighResImageUrl(track.coverUrl)}
                    alt={track.title}
                    style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#ffffff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {track.title}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--text-subdued)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {track.artist}
                    </span>
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
