import React, { useState, useEffect } from 'react';
import { Play, Pause, Heart, Clock, MoreHorizontal, ArrowDownCircle } from 'lucide-react';
import { Playlist, Track } from '../types';
import { extractDominantColor, getFallbackPlaylistColor } from '../utils/colorExtractor';

interface MainContentProps {
  currentView: string;
  selectedPlaylist: Playlist | null;
  onSelectPlaylist: (id: string) => void;
  playlists: Playlist[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onTogglePlay: () => void;
  likedTrackIds: Set<string>;
  onToggleLikeTrack: (trackId: string) => void;
  searchQuery: string;
  searchResults: Track[];
  searchPlaylists?: Playlist[];
  onSelectSearchPlaylist?: (playlist: Playlist, autoPlay?: boolean) => void;
  onSelectSearchCategory?: (category: string) => void;
  isSearching: boolean;
  allTracks: Track[];
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const MainContent: React.FC<MainContentProps> = ({
  currentView,
  selectedPlaylist,
  onSelectPlaylist,
  playlists,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  likedTrackIds,
  onToggleLikeTrack,
  searchQuery,
  searchResults,
  searchPlaylists = [],
  onSelectSearchPlaylist,
  onSelectSearchCategory,
  isSearching,
  allTracks
}) => {
  const [activeChip, setActiveChip] = useState<'all' | 'music' | 'podcasts'>('all');
  const [searchFilter, setSearchFilter] = useState<'all' | 'tracks' | 'playlists'>('all');
  const [hoveredTrackIndex, setHoveredTrackIndex] = useState<number | null>(null);
  const [extractedHeaderColor, setExtractedHeaderColor] = useState<string>('#77010b');
  const [scrolledPastHero, setScrolledPastHero] = useState<boolean>(false);

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;

    const handleScroll = () => {
      setScrolledPastHero(mainEl.scrollTop > 240);
    };

    mainEl.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      mainEl.removeEventListener('scroll', handleScroll);
    };
  }, [selectedPlaylist?.id, currentView]);

  const getTrackDateAdded = (index: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = ((index * 7 + 13) % 28) + 1;
    const month = months[(index * 3 + 2) % 12];
    const year = 2026 - Math.floor(index / 60);
    return `${month} ${day < 10 ? '0' : ''}${day}, ${year}`;
  };

  useEffect(() => {
    if (!selectedPlaylist) return;
    const initial = getFallbackPlaylistColor(selectedPlaylist.title, selectedPlaylist.coverUrl);
    setExtractedHeaderColor(initial);

    if (selectedPlaylist.coverUrl) {
      extractDominantColor(selectedPlaylist.coverUrl, selectedPlaylist.title).then(color => {
        if (color) {
          setExtractedHeaderColor(color);
        }
      });
    }
  }, [selectedPlaylist?.id, selectedPlaylist?.coverUrl]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Helper renderer for track rows
  const renderTrackRow = (t: Track, idx: number) => {
    const isCurrent = currentTrack?.id === t.id;
    const isLiked = likedTrackIds.has(t.id);
    const isHovered = hoveredTrackIndex === idx;

    return (
      <div
        key={t.id}
        onClick={() => onPlayTrack(t)}
        onMouseEnter={() => setHoveredTrackIndex(idx)}
        onMouseLeave={() => setHoveredTrackIndex(null)}
        style={{
          display: 'grid',
          gridTemplateColumns: '40px 4fr 3fr 100px',
          alignItems: 'center',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer',
          backgroundColor: isCurrent ? 'rgba(255, 255, 255, 0.1)' : isHovered ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
          transition: 'background-color 0.1s ease',
          height: '56px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isHovered ? (
            <Play size={16} fill="#ffffff" color="#ffffff" />
          ) : isCurrent && isPlaying ? (
            <Play size={16} fill="#1ed760" color="#1ed760" />
          ) : (
            <span style={{ fontSize: '14px', color: isCurrent ? '#1ed760' : 'var(--text-subdued)' }}>
              {idx + 1}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src={t.coverUrl}
            alt={t.title}
            style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <span style={{
              fontSize: '14px',
              fontWeight: 600,
              color: isCurrent ? '#1ed760' : '#ffffff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {t.title}
            </span>
            <span style={{
              fontSize: '12px',
              color: 'var(--text-subdued)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {t.artist}
            </span>
          </div>
        </div>

        <span style={{
          fontSize: '13px',
          color: 'var(--text-subdued)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {t.album}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px' }}>
          <button
            onClick={e => {
              e.stopPropagation();
              onToggleLikeTrack(t.id);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isLiked ? '#1ed760' : isHovered ? 'var(--text-subdued)' : 'transparent'
            }}
          >
            <Heart size={16} fill={isLiked ? '#1ed760' : 'none'} strokeWidth={isLiked ? 0 : 2} />
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-subdued)' }}>
            {formatDuration(t.duration)}
          </span>
        </div>
      </div>
    );
  };

  // Helper renderer for playlist cards
  const renderPlaylistCard = (pl: Playlist) => (
    <div
      key={pl.id}
      onClick={() => {
        if (onSelectSearchPlaylist) {
          onSelectSearchPlaylist(pl, false);
        } else {
          onSelectPlaylist(pl.id);
        }
      }}
      style={{
        backgroundColor: '#181818',
        padding: '16px',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
        position: 'relative'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor = '#282828';
        const playBtn = e.currentTarget.querySelector('.search-card-play') as HTMLElement;
        if (playBtn) {
          playBtn.style.opacity = '1';
          playBtn.style.transform = 'translateY(0)';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = '#181818';
        const playBtn = e.currentTarget.querySelector('.search-card-play') as HTMLElement;
        if (playBtn) {
          playBtn.style.opacity = '0';
          playBtn.style.transform = 'translateY(8px)';
        }
      }}
    >
      <div style={{
        position: 'relative',
        width: '100%',
        paddingBottom: '100%',
        marginBottom: '16px',
        borderRadius: '6px',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
      }}>
        <img
          src={pl.coverUrl}
          alt={pl.title}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
        {/* Floating Play Button */}
        <button
          className="search-card-play"
          onClick={e => {
            e.stopPropagation();
            if (onSelectSearchPlaylist) {
              onSelectSearchPlaylist(pl, true);
            } else {
              onSelectPlaylist(pl.id);
            }
          }}
          title={`Play ${pl.title}`}
          style={{
            position: 'absolute',
            right: '8px',
            bottom: '8px',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#1ed760',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
            opacity: 0,
            transform: 'translateY(8px)',
            transition: 'opacity 0.2s ease, transform 0.2s ease, background-color 0.15s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1fdf64')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1ed760')}
        >
          <Play size={22} fill="#000000" color="#000000" style={{ marginLeft: '2px' }} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{
          fontSize: '16px',
          fontWeight: 700,
          color: '#ffffff',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: '4px'
        }}>
          {pl.title}
        </span>
        <span style={{
          fontSize: '13px',
          color: 'var(--text-subdued)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {pl.author ? `By ${pl.author}` : pl.description || 'Spotify Playlist'}
        </span>
      </div>
    </div>
  );

  // 1. SEARCH VIEW
  if (currentView === 'search') {
    return (
      <div style={{ padding: '24px 32px 32px 32px' }} className="animate-fade-in">
        {searchQuery.trim() ? (
          <div>
            {/* Filter Pills (All, Songs, Playlists) */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', alignItems: 'center' }}>
              {(['all', 'tracks', 'playlists'] as const).map(tab => {
                const isActive = searchFilter === tab;
                const label = tab === 'all' ? 'All' : tab === 'tracks' ? 'Songs' : 'Playlists';
                return (
                  <button
                    key={tab}
                    onClick={() => setSearchFilter(tab)}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '500px',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      backgroundColor: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                      color: isActive ? '#000000' : '#ffffff',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {label}
                  </button>
                );
              })}
              {isSearching && (
                <span style={{ fontSize: '13px', color: '#1ed760', marginLeft: 'auto' }}>Searching Spotify...</span>
              )}
            </div>

            {/* TAB: ALL */}
            {searchFilter === 'all' && (
              <div>
                {/* Songs Section */}
                {searchResults.length > 0 && (
                  <div style={{ marginBottom: '36px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Songs</h2>
                      {searchResults.length > 4 && (
                        <button
                          onClick={() => setSearchFilter('tracks')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-subdued)',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subdued)')}
                        >
                          Show all
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {searchResults.slice(0, 4).map((t, idx) => renderTrackRow(t, idx))}
                    </div>
                  </div>
                )}

                {/* Playlists Section */}
                {searchPlaylists.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Playlists</h2>
                      {searchPlaylists.length > 6 && (
                        <button
                          onClick={() => setSearchFilter('playlists')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-subdued)',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subdued)')}
                        >
                          Show all
                        </button>
                      )}
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: '24px'
                    }}>
                      {searchPlaylists.slice(0, 8).map(pl => renderPlaylistCard(pl))}
                    </div>
                  </div>
                )}

                {searchResults.length === 0 && searchPlaylists.length === 0 && !isSearching && (
                  <p style={{ color: 'var(--text-subdued)', marginTop: '20px' }}>
                    No results found for "{searchQuery}". Try searching for an artist, song, or playlist name.
                  </p>
                )}
              </div>
            )}

            {/* TAB: SONGS */}
            {searchFilter === 'tracks' && (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>Songs</h2>
                {searchResults.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {searchResults.map((t, idx) => renderTrackRow(t, idx))}
                  </div>
                ) : !isSearching ? (
                  <p style={{ color: 'var(--text-subdued)', marginTop: '20px' }}>No songs found.</p>
                ) : null}
              </div>
            )}

            {/* TAB: PLAYLISTS */}
            {searchFilter === 'playlists' && (
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>Playlists</h2>
                {searchPlaylists.length > 0 ? (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '24px'
                  }}>
                    {searchPlaylists.map(pl => renderPlaylistCard(pl))}
                  </div>
                ) : !isSearching ? (
                  <p style={{ color: 'var(--text-subdued)', marginTop: '20px' }}>No playlists found.</p>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '20px' }}>Browse all</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '24px'
            }}>
              {[
                { name: 'Podcasts', bg: '#006450' },
                { name: 'Live Events', bg: '#8400e7' },
                { name: 'Made For You', bg: '#1e3264' },
                { name: 'New Releases', bg: '#e8115b' },
                { name: 'Pop', bg: '#148a08' },
                { name: 'Hip-Hop', bg: '#bc5900' },
                { name: 'Rock', bg: '#e91429' },
                { name: 'Lofi & Chill', bg: '#503750' }
              ].map(cat => (
                <div
                  key={cat.name}
                  onClick={() => onSelectSearchCategory && onSelectSearchCategory(cat.name)}
                  style={{
                    height: '180px',
                    backgroundColor: cat.bg,
                    borderRadius: '8px',
                    padding: '16px',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    transition: 'transform 0.15s ease'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. PLAYLIST OR LIKED SONGS VIEW
  if (currentView === 'playlist' || currentView === 'liked') {
    const isLikedView = currentView === 'liked';
    const playlist = isLikedView
      ? {
          id: 'liked',
          title: 'Liked Songs',
          description: 'Your favorite tracks in one place.',
          coverUrl: '',
          gradient: '#450af5',
          tracks: allTracks.filter(t => likedTrackIds.has(t.id))
        }
      : selectedPlaylist;

    if (!playlist) {
      return (
        <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-subdued)' }}>
          Select a playlist to start listening.
        </div>
      );
    }

    const totalDurationSeconds = playlist.tracks.reduce((acc, t) => acc + (t.duration || 180), 0);
    const hours = Math.floor(totalDurationSeconds / 3600);
    const minutes = Math.floor((totalDurationSeconds % 3600) / 60);
    const durationText = hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;

    const headerColor = isLikedView
      ? '#450af5'
      : (extractedHeaderColor || getFallbackPlaylistColor(playlist.title, playlist.coverUrl));

    return (
      <div className="animate-fade-in" style={{ paddingBottom: '32px' }}>
        {/* Sticky Playlist Header Bar (Dominant Color, Play Button, Playlist Title) */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          width: '100%',
          height: '64px',
          marginBottom: '-64px',
          backgroundColor: scrolledPastHero ? headerColor : 'transparent',
          boxShadow: scrolledPastHero ? '0 4px 20px rgba(0, 0, 0, 0.5)' : 'none',
          transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          padding: '0 32px',
          gap: '16px',
          pointerEvents: scrolledPastHero ? 'auto' : 'none'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            opacity: scrolledPastHero ? 1 : 0,
            transform: scrolledPastHero ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.2s ease, transform 0.2s ease'
          }}>
            <button
              onClick={() => {
                if (playlist.tracks.length > 0) {
                  if (currentTrack && playlist.tracks.some(t => t.id === currentTrack.id)) {
                    onTogglePlay();
                  } else {
                    onPlayTrack(playlist.tracks[0]);
                  }
                }
              }}
              title="Play playlist"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#1ed760',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                transition: 'transform 0.15s ease, background-color 0.15s ease',
                flexShrink: 0
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.06)';
                e.currentTarget.style.backgroundColor = '#1fdf64';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.backgroundColor = '#1ed760';
              }}
            >
              {isPlaying && currentTrack && playlist.tracks.some(t => t.id === currentTrack.id) ? (
                <Pause size={20} fill="#000000" color="#000000" />
              ) : (
                <Play size={20} fill="#000000" color="#000000" style={{ marginLeft: '2px' }} />
              )}
            </button>
            <span style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.5px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {playlist.title}
            </span>
          </div>
        </div>

        {/* Dynamic Gradient Hero Header */}
        <div style={{
          padding: '40px 32px 24px 32px',
          background: `linear-gradient(to bottom, ${headerColor} 0%, rgba(18, 18, 18, 0.95) 100%)`,
          transition: 'background 0.3s ease',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '24px',
          minHeight: '300px'
        }}>
          {isLikedView ? (
            <div style={{
              width: '232px',
              height: '232px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #450af5, #8e8ee5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 60px rgba(0,0,0,0.5)',
              flexShrink: 0
            }}>
              <Heart size={84} fill="#ffffff" color="#ffffff" />
            </div>
          ) : (
            <img
              src={playlist.coverUrl}
              alt={playlist.title}
              style={{
                width: '232px',
                height: '232px',
                borderRadius: '6px',
                objectFit: 'cover',
                boxShadow: '0 4px 60px rgba(0,0,0,0.5)',
                flexShrink: 0
              }}
            />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Playlist
            </span>
            <h1 style={{
              fontSize: playlist.title.length > 25 ? '48px' : '68px',
              fontWeight: 900,
              letterSpacing: '-2px',
              margin: '2px 0',
              lineHeight: 1.05
            }}>
              {playlist.title}
            </h1>
            <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '4px' }}>
              {playlist.description}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '16px', fontWeight: 300 }}>+</span>
                <span>{playlist.author || 'Spotify'}</span>
              </span>
              <span>•</span>
              <span>{playlist.tracks.length} songs,</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontWeight: 400 }}>{durationText}</span>
            </div>
          </div>
        </div>

        {/* Action Row */}
        <div style={{
          padding: '24px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: '28px'
        }}>
          {/* Big Green Play Button */}
          <button
            onClick={() => {
              if (playlist.tracks.length > 0) {
                if (currentTrack && playlist.tracks.some(t => t.id === currentTrack.id)) {
                  onTogglePlay();
                } else {
                  onPlayTrack(playlist.tracks[0]);
                }
              }
            }}
            title="Play playlist"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#1ed760',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
              transition: 'transform 0.15s ease, background-color 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.backgroundColor = '#1fdf64';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.backgroundColor = '#1ed760';
            }}
          >
            {isPlaying && currentTrack && playlist.tracks.some(t => t.id === currentTrack.id) ? (
              <Pause size={24} fill="#000000" color="#000000" />
            ) : (
              <Play size={24} fill="#000000" color="#000000" style={{ marginLeft: '3px' }} />
            )}
          </button>

          <button
            title="Save to Your Library"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-subdued)',
              cursor: 'pointer',
              display: 'flex'
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subdued)')}
          >
            <Heart size={30} />
          </button>

          <button
            title="Download"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-subdued)',
              cursor: 'pointer',
              display: 'flex'
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subdued)')}
          >
            <ArrowDownCircle size={30} />
          </button>

          <button
            title="More options"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-subdued)',
              cursor: 'pointer',
              display: 'flex'
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subdued)')}
          >
            <MoreHorizontal size={30} />
          </button>
        </div>

        {/* Track Table */}
        <div style={{ padding: '0 32px' }}>
          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '40px 4fr 3fr 2fr 100px',
            padding: '8px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '12px',
            color: 'var(--text-subdued)',
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            marginBottom: '8px',
            position: 'sticky',
            top: '64px',
            zIndex: 25,
            backgroundColor: 'var(--background-base)'
          }}>
            <span style={{ textAlign: 'center' }}>#</span>
            <span>Title</span>
            <span>Album</span>
            <span>Date added</span>
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '8px' }}>
              <Clock size={16} />
            </div>
          </div>

          {/* Table Rows */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {playlist.tracks.map((track, index) => {
              const isCurrent = currentTrack?.id === track.id;
              const isLiked = likedTrackIds.has(track.id);
              const isHovered = hoveredTrackIndex === index;

              return (
                <div
                  key={track.id}
                  onClick={() => onPlayTrack(track)}
                  onMouseEnter={() => setHoveredTrackIndex(index)}
                  onMouseLeave={() => setHoveredTrackIndex(null)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 4fr 3fr 2fr 100px',
                    alignItems: 'center',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: isCurrent ? 'rgba(255, 255, 255, 0.1)' : isHovered ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                    transition: 'background-color 0.1s ease',
                    height: '56px'
                  }}
                >
                  {/* # or Play Icon */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isHovered ? (
                      <Play size={16} fill="#ffffff" color="#ffffff" />
                    ) : isCurrent && isPlaying ? (
                      <Play size={16} fill="#1ed760" color="#1ed760" />
                    ) : (
                      <span style={{ fontSize: '14px', color: isCurrent ? '#1ed760' : 'var(--text-subdued)' }}>
                        {index + 1}
                      </span>
                    )}
                  </div>

                  {/* Title & Artist */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', overflow: 'hidden' }}>
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: isCurrent ? '#1ed760' : '#ffffff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {track.title}
                      </span>
                      <span style={{
                        fontSize: '12px',
                        color: 'var(--text-subdued)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {track.artist}
                      </span>
                    </div>
                  </div>

                  {/* Album */}
                  <span style={{
                    fontSize: '13px',
                    color: 'var(--text-subdued)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {track.album}
                  </span>

                  {/* Date Added */}
                  <span style={{
                    fontSize: '13px',
                    color: 'var(--text-subdued)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {getTrackDateAdded(index)}
                  </span>

                  {/* Duration & Heart */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px' }}>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onToggleLikeTrack(track.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: isLiked ? '#1ed760' : isHovered ? 'var(--text-subdued)' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex'
                      }}
                    >
                      <Heart size={16} fill={isLiked ? '#1ed760' : 'none'} strokeWidth={isLiked ? 0 : 2} />
                    </button>
                    <span style={{ fontSize: '13px', color: 'var(--text-subdued)', minWidth: '35px', textAlign: 'right' }}>
                      {formatDuration(track.duration)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 3. HOME VIEW (DEFAULT)
  return (
    <div style={{ padding: '16px 32px 32px 32px' }} className="animate-fade-in">
      {/* Filter Chips Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {(['all', 'music', 'podcasts'] as const).map(chip => {
          const isActive = activeChip === chip;
          return (
            <button
              key={chip}
              onClick={() => setActiveChip(chip)}
              style={{
                padding: '6px 14px',
                borderRadius: '500px',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                color: isActive ? '#000000' : '#ffffff',
                textTransform: 'capitalize',
                transition: 'all 0.15s ease'
              }}
            >
              {chip}
            </button>
          );
        })}
      </div>

      {/* Greeting */}
      <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px', letterSpacing: '-0.5px' }}>
        {getGreeting()}
      </h1>

      {/* 2x3 Quick Play Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '12px',
        marginBottom: '36px'
      }}>
        {playlists.map(pl => (
          <div
            key={pl.id}
            onClick={() => onSelectPlaylist(pl.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
              overflow: 'hidden',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background-color 0.2s ease',
              height: '64px'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.16)';
              const playBtn = e.currentTarget.querySelector('.floating-play') as HTMLElement;
              if (playBtn) {
                playBtn.style.opacity = '1';
                playBtn.style.transform = 'scale(1)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              const playBtn = e.currentTarget.querySelector('.floating-play') as HTMLElement;
              if (playBtn) {
                playBtn.style.opacity = '0';
                playBtn.style.transform = 'scale(0.9)';
              }
            }}
          >
            <img src={pl.coverUrl} alt={pl.title} style={{ width: '64px', height: '64px', objectFit: 'cover' }} />
            <span style={{
              fontSize: '14px',
              fontWeight: 700,
              padding: '0 16px',
              flex: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {pl.title}
            </span>

            {/* Hover Floating Play Button */}
            <div
              className="floating-play"
              onClick={e => {
                e.stopPropagation();
                if (pl.tracks.length > 0) onPlayTrack(pl.tracks[0]);
              }}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#1ed760',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
                marginRight: '12px',
                opacity: 0,
                transform: 'scale(0.9)',
                transition: 'opacity 0.2s ease, transform 0.15s ease'
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <Play size={20} fill="#000000" color="#000000" style={{ marginLeft: '2px' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Made For You Carousel Grid */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>Made For You</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '24px'
        }}>
          {playlists.map(pl => (
            <div
              key={pl.id}
              onClick={() => onSelectPlaylist(pl.id)}
              style={{
                backgroundColor: '#181818',
                padding: '16px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#282828';
                const playBtn = e.currentTarget.querySelector('.card-play') as HTMLElement;
                if (playBtn) {
                  playBtn.style.opacity = '1';
                  playBtn.style.transform = 'translateY(0)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '#181818';
                const playBtn = e.currentTarget.querySelector('.card-play') as HTMLElement;
                if (playBtn) {
                  playBtn.style.opacity = '0';
                  playBtn.style.transform = 'translateY(8px)';
                }
              }}
            >
              <div style={{ position: 'relative', width: '100%', paddingBottom: '100%', marginBottom: '12px' }}>
                <img
                  src={pl.coverUrl}
                  alt={pl.title}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    borderRadius: '6px',
                    objectFit: 'cover'
                  }}
                />
                <div
                  className="card-play"
                  onClick={e => {
                    e.stopPropagation();
                    if (pl.tracks.length > 0) onPlayTrack(pl.tracks[0]);
                  }}
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#1ed760',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                    opacity: 0,
                    transform: 'translateY(8px)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Play size={20} fill="#000000" color="#000000" style={{ marginLeft: '2px' }} />
                </div>
              </div>
              <h3 style={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {pl.title}
              </h3>
              <p style={{
                fontSize: '12px',
                color: 'var(--text-subdued)',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                By Spotify
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
