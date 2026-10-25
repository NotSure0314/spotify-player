import React, { useState, useEffect, useMemo } from 'react';
import { Heart, Clock, MoreHorizontal, ArrowDownCircle, Plus, Check, Shuffle } from 'lucide-react';
import { Playlist, Track } from '../types';
import { extractDominantColor, getFallbackPlaylistColor, darkenColor } from '../utils/colorExtractor';
import { SpotifyUserProfile } from '../spotifyApi';
import { getHighResImageUrl } from '../utils/imageUtils';
import { SpotifyPlayIcon, SpotifyPauseIcon, SpotifyPinIcon } from './SpotifyIcons';
import {
  HomeCardItem,
  QUICK_ACCESS_ITEMS,
  MADE_FOR_YOU_ITEMS,
  JUMP_BACK_IN_ITEMS,
  RECENTS_ITEMS,
  RECOMMENDED_STATIONS,
  TOP_MIXES,
  RECOMMENDED_FOR_TODAY,
  FEATURED_RADIO_CARDS
} from '../utils/homeData';

interface MainContentProps {
  currentView: string;
  selectedPlaylist: Playlist | null;
  onSelectPlaylist: (id: string, autoPlay?: boolean) => void;
  onPlayPlaylistOrAlbum?: (item: HomeCardItem, autoPlay?: boolean) => void;
  playlists: Playlist[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track, contextTracks?: Track[], playlistInfo?: { id: string; title: string }) => void;
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
  userProfile?: SpotifyUserProfile | null;
  isPlaylistSaved?: boolean;
  onToggleSavePlaylist?: (playlist: Playlist) => void;
  isShuffle?: boolean;
  onToggleShuffle?: (playlist?: Playlist) => void;
  isPlaylistPinned?: boolean;
  onTogglePinPlaylist?: (playlist: Playlist) => void;
  pinnedPlaylistIds?: string[];
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// Dynamic Title sizing matching official Spotify:
// Priority #1 is the album/playlist photo fitting perfectly without displacement.
// Short titles ("Gym", "ye") scale up to bold massive text; long titles dynamically
// scale down cleanly to 1-2 lines without pushing or moving the photo.
const getPlaylistTitleStyle = (title: string) => {
  const len = (title || '').trim().length;
  if (len <= 7) {
    return {
      fontSize: 'clamp(44px, 5.8vw, 88px)',
      lineHeight: '1.0',
      letterSpacing: '-0.04em',
      maxLines: 1
    };
  } else if (len <= 14) {
    return {
      fontSize: 'clamp(34px, 4.2vw, 64px)',
      lineHeight: '1.04',
      letterSpacing: '-0.03em',
      maxLines: 2
    };
  } else if (len <= 24) {
    return {
      fontSize: 'clamp(28px, 3.2vw, 46px)',
      lineHeight: '1.08',
      letterSpacing: '-0.025em',
      maxLines: 2
    };
  } else if (len <= 38) {
    return {
      fontSize: 'clamp(22px, 2.4vw, 34px)',
      lineHeight: '1.14',
      letterSpacing: '-0.02em',
      maxLines: 2
    };
  } else {
    return {
      fontSize: 'clamp(18px, 1.9vw, 26px)',
      lineHeight: '1.18',
      letterSpacing: '-0.015em',
      maxLines: 2
    };
  }
};

export const MainContent: React.FC<MainContentProps> = ({
  currentView,
  selectedPlaylist,
  onSelectPlaylist,
  onPlayPlaylistOrAlbum,
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
  allTracks,
  userProfile,
  isPlaylistSaved = false,
  onToggleSavePlaylist,
  isShuffle = false,
  onToggleShuffle,
  isPlaylistPinned = false,
  onTogglePinPlaylist,
  pinnedPlaylistIds = []
}) => {
  const [activeChip, setActiveChip] = useState<'all' | 'music' | 'podcasts' | 'audiobooks'>('all');
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

  const displayName = userProfile?.name || userProfile?.id || 'Spotify';

  // Library-sorted playlists: ensures exact matching order with the library sidebar (pinned first, then unpinned)
  const librarySortedPlaylists = useMemo(() => {
    if (!playlists || playlists.length === 0) return [];
    if (!pinnedPlaylistIds || pinnedPlaylistIds.length === 0) return playlists;

    const pinnedSet = new Set(
      pinnedPlaylistIds.map(id => id.replace('spotify:playlist:', '').replace('spotify:album:', ''))
    );
    const isItemPinned = (pl: Playlist) => {
      const cleanId = (pl.playlistId || pl.id).replace('spotify:playlist:', '').replace('spotify:album:', '');
      return pinnedSet.has(cleanId) || pinnedPlaylistIds.includes(pl.id);
    };

    const pinned: Playlist[] = [];
    for (const pid of pinnedPlaylistIds) {
      const cleanPid = pid.replace('spotify:playlist:', '').replace('spotify:album:', '');
      const found = playlists.find(p => {
        const pClean = (p.playlistId || p.id).replace('spotify:playlist:', '').replace('spotify:album:', '');
        return p.id === pid || pClean === cleanPid;
      });
      if (found && !pinned.some(p => p.id === found.id)) {
        pinned.push(found);
      }
    }

    const unpinned = playlists.filter(p => !isItemPinned(p));
    return [...pinned, ...unpinned];
  }, [playlists, pinnedPlaylistIds]);

  // Dynamically compute Quick Access cards from the current synced user's library playlists!
  const quickAccessItems: HomeCardItem[] = useMemo(() => {
    const sourcePlaylists = librarySortedPlaylists.length > 0 ? librarySortedPlaylists : playlists;
    if (sourcePlaylists && sourcePlaylists.length > 0) {
      const userCards: HomeCardItem[] = sourcePlaylists.slice(0, 8).map(p => ({
        id: p.id,
        title: p.title,
        subtitle: p.description || `Playlist • ${p.author || displayName}`,
        image: getHighResImageUrl(p.coverUrl),
        type: 'playlist',
        spotifyUri: p.playlistId || p.id
      }));

      if (userCards.length >= 8) {
        return userCards;
      }

      // If user has fewer than 8 playlists, supplement with generic Spotify curated playlists
      const fallbackCurated: HomeCardItem[] = [
        {
          id: 'curated-top-hits',
          title: "Today's Top Hits",
          subtitle: 'Playlist • Spotify',
          image: 'https://i.scdn.co/image/ab67706f00000002e8ccdd567fff6a597b87586b',
          type: 'playlist',
          spotifyUri: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M'
        },
        {
          id: 'curated-rapcaviar',
          title: 'RapCaviar',
          subtitle: 'Playlist • Spotify',
          image: 'https://i.scdn.co/image/ab67706f000000021b4a02be0495f32b5006b528',
          type: 'playlist',
          spotifyUri: 'spotify:playlist:37i9dQZF1DX0XUsuxWHRQd'
        },
        {
          id: 'curated-lofi',
          title: 'Lofi Beats',
          subtitle: 'Playlist • Spotify',
          image: 'https://i.scdn.co/image/ab67706f000000025741f92e8fed54f24559196b',
          type: 'playlist',
          spotifyUri: 'spotify:playlist:37i9dQZF1DX4t95PaoR1T0'
        },
        {
          id: 'curated-rock',
          title: '00s Rock Anthems',
          subtitle: 'Playlist • Spotify',
          image: 'https://i.scdn.co/image/ab67706f0000000258cb9f9b5a037b5f54ccca27',
          type: 'playlist',
          spotifyUri: 'spotify:playlist:37i9dQZF1DX3oM43CtKnRV'
        }
      ];

      const filteredCurated = fallbackCurated.filter(
        c => !userCards.some(u => u.title.toLowerCase() === c.title.toLowerCase())
      );
      return [...userCards, ...filteredCurated.slice(0, 8 - userCards.length)];
    }
    return QUICK_ACCESS_ITEMS;
  }, [librarySortedPlaylists, playlists, displayName]);

  // Dynamically compute Recents cards from the current synced user's library playlists!
  const recentsItems: HomeCardItem[] = useMemo(() => {
    const sourcePlaylists = librarySortedPlaylists.length > 0 ? librarySortedPlaylists : playlists;
    if (sourcePlaylists && sourcePlaylists.length > 0) {
      return sourcePlaylists.slice(0, 8).map(p => ({
        id: `recent-${p.id}`,
        title: p.title,
        subtitle: p.description || `Playlist • ${p.author || displayName}`,
        image: getHighResImageUrl(p.coverUrl),
        type: 'playlist',
        spotifyUri: p.playlistId || p.id
      }));
    }
    return RECENTS_ITEMS;
  }, [librarySortedPlaylists, playlists, displayName]);

  // Dynamically compute Jump Back In cards from the current synced user's library playlists!
  const jumpBackInItems: HomeCardItem[] = useMemo(() => {
    const sourcePlaylists = librarySortedPlaylists.length > 0 ? librarySortedPlaylists : playlists;
    if (sourcePlaylists && sourcePlaylists.length > 4) {
      return [...sourcePlaylists].reverse().slice(0, 8).map(p => ({
        id: `jump-${p.id}`,
        title: p.title,
        subtitle: p.description || `Playlist • ${p.author || displayName}`,
        image: getHighResImageUrl(p.coverUrl),
        type: 'playlist',
        spotifyUri: p.playlistId || p.id
      }));
    }
    return JUMP_BACK_IN_ITEMS;
  }, [librarySortedPlaylists, playlists, displayName]);

  // Helper renderer for track rows
  const renderTrackRow = (t: Track, idx: number) => {
    const isCurrent = Boolean(
      currentTrack && (
        currentTrack.id === t.id ||
        (currentTrack.title.trim().toLowerCase() === t.title.trim().toLowerCase() &&
         currentTrack.artist.trim().toLowerCase() === t.artist.trim().toLowerCase())
      )
    );
    const isLiked = likedTrackIds.has(t.id);
    const isHovered = hoveredTrackIndex === idx;

    return (
      <div
        key={t.id}
        onClick={() => onPlayTrack(t, searchResults, { id: 'search', title: 'Search Results' })}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px' }}>
          {isHovered ? (
            isCurrent && isPlaying ? (
              <SpotifyPauseIcon size={16} fill="#ffffff" onClick={(e) => { e.stopPropagation(); onTogglePlay(); }} />
            ) : (
              <SpotifyPlayIcon size={16} fill="#ffffff" onClick={(e) => { e.stopPropagation(); onPlayTrack(t, searchResults, { id: 'search', title: 'Search Results' }); }} />
            )
          ) : isCurrent && isPlaying ? (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '14px' }}>
              <span className="spotify-eq-bar spotify-eq-1" />
              <span className="spotify-eq-bar spotify-eq-2" />
              <span className="spotify-eq-bar spotify-eq-3" />
              <span className="spotify-eq-bar spotify-eq-4" />
            </div>
          ) : (
            <span style={{ fontSize: '14px', color: isCurrent ? '#1ed760' : 'var(--text-subdued)' }}>
              {idx + 1}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src={getHighResImageUrl(t.coverUrl)}
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
          src={getHighResImageUrl(pl.coverUrl)}
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
          <SpotifyPlayIcon size={22} fill="#000000" />
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
    const darkenedHeaderColor = darkenColor(headerColor, 0.56);
    const titleStyle = getPlaylistTitleStyle(playlist.title);

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
          backgroundColor: scrolledPastHero ? darkenedHeaderColor : 'transparent',
          boxShadow: scrolledPastHero ? '0 4px 20px rgba(0, 0, 0, 0.5)' : 'none',
          transition: 'background-color 0.25s ease, box-shadow 0.25s ease',
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
                  const isMatch = currentTrack && playlist.tracks.some(t =>
                    t.id === currentTrack.id ||
                    (t.title.trim().toLowerCase() === currentTrack.title.trim().toLowerCase() &&
                     t.artist.trim().toLowerCase() === currentTrack.artist.trim().toLowerCase())
                  );
                  if (isMatch) {
                    onTogglePlay();
                  } else {
                    const startTrack = isShuffle
                      ? playlist.tracks[Math.floor(Math.random() * playlist.tracks.length)]
                      : playlist.tracks[0];
                    onPlayTrack(startTrack, playlist.tracks, { id: playlist.id, title: playlist.title });
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
              {isPlaying && currentTrack && playlist.tracks.some(t =>
                t.id === currentTrack.id ||
                (t.title.trim().toLowerCase() === currentTrack.title.trim().toLowerCase() &&
                 t.artist.trim().toLowerCase() === currentTrack.artist.trim().toLowerCase())
              ) ? (
                <SpotifyPauseIcon size={20} fill="#000000" />
              ) : (
                <SpotifyPlayIcon size={20} fill="#000000" />
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
        <div
          className="playlist-header-wrap"
          style={{
            background: `linear-gradient(to bottom, ${headerColor} 0%, rgba(18, 18, 18, 0.95) 100%)`,
            transition: 'background 0.3s ease'
          }}
        >
          {isLikedView ? (
            <div
              className="playlist-header-cover"
              style={{
                background: 'linear-gradient(135deg, #450af5, #8e8ee5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Heart size={64} fill="#ffffff" color="#ffffff" />
            </div>
          ) : (
            <img
              src={getHighResImageUrl(playlist.coverUrl)}
              alt={playlist.title}
              className="playlist-header-cover"
            />
          )}

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            gap: '4px',
            minWidth: 0,
            overflow: 'hidden',
            flex: 1
          }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isLikedView
                ? 'Playlist'
                : (playlist.description?.toLowerCase().includes('album') || playlist.id.includes(':album:')
                  ? 'Album'
                  : 'Public Playlist')}
            </span>
            <h1
              className="playlist-header-title"
              style={{
                fontSize: titleStyle.fontSize,
                lineHeight: titleStyle.lineHeight,
                letterSpacing: titleStyle.letterSpacing,
                WebkitLineClamp: titleStyle.maxLines
              }}
            >
              {playlist.title}
            </h1>
            {playlist.description && (
              <p style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.7)',
                marginTop: '4px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: '1.4'
              }}>
                {playlist.description}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '14px', fontWeight: 600, marginTop: '6px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ffffff', fontWeight: 700 }}>
                <span style={{ fontSize: '15px', fontWeight: 400 }}>+</span>
                <span>{playlist.author || userProfile?.name || 'Spotify'}</span>
              </span>
              <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>•</span>
              <span style={{ color: '#ffffff' }}>{playlist.tracks.length} songs,</span>
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
                const isMatch = currentTrack && playlist.tracks.some(t =>
                  t.id === currentTrack.id ||
                  (t.title.trim().toLowerCase() === currentTrack.title.trim().toLowerCase() &&
                   t.artist.trim().toLowerCase() === currentTrack.artist.trim().toLowerCase())
                );
                if (isMatch) {
                  onTogglePlay();
                } else {
                  const startTrack = isShuffle
                    ? playlist.tracks[Math.floor(Math.random() * playlist.tracks.length)]
                    : playlist.tracks[0];
                  onPlayTrack(startTrack, playlist.tracks, { id: playlist.id, title: playlist.title });
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
            {isPlaying && currentTrack && playlist.tracks.some(t =>
              t.id === currentTrack.id ||
              (t.title.trim().toLowerCase() === currentTrack.title.trim().toLowerCase() &&
               t.artist.trim().toLowerCase() === currentTrack.artist.trim().toLowerCase())
            ) ? (
              <SpotifyPauseIcon size={24} fill="#000000" />
            ) : (
              <SpotifyPlayIcon size={24} fill="#000000" />
            )}
          </button>

          {/* Shuffle Button */}
          <button
            onClick={() => onToggleShuffle && onToggleShuffle(playlist)}
            title={isShuffle ? "Disable shuffle" : "Enable shuffle"}
            className={`spotify-shuffle-btn ${isShuffle ? 'active' : ''}`}
            style={{
              padding: '4px'
            }}
          >
            <Shuffle size={26} strokeWidth={2.2} />
            {isShuffle && (
              <span style={{
                width: '4px',
                height: '4px',
                backgroundColor: '#1ed760',
                borderRadius: '50%',
                position: 'absolute',
                bottom: '-4px'
              }} />
            )}
          </button>

          {/* Plus / Check Save to Library Button */}
          {!isLikedView && (
            <button
              onClick={() => onToggleSavePlaylist && playlist && onToggleSavePlaylist(playlist)}
              title={isPlaylistSaved ? "Remove from Your Library" : "Save to Your Library"}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: isPlaylistSaved ? 'none' : '2px solid rgba(255, 255, 255, 0.7)',
                backgroundColor: isPlaylistSaved ? '#1ed760' : 'transparent',
                color: isPlaylistSaved ? '#000000' : 'rgba(255, 255, 255, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
                transition: 'transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease'
              }}
              onMouseEnter={e => {
                if (isPlaylistSaved) {
                  e.currentTarget.style.backgroundColor = '#1fdf64';
                  e.currentTarget.style.transform = 'scale(1.06)';
                } else {
                  e.currentTarget.style.borderColor = '#ffffff';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.transform = 'scale(1.06)';
                }
              }}
              onMouseLeave={e => {
                if (isPlaylistSaved) {
                  e.currentTarget.style.backgroundColor = '#1ed760';
                  e.currentTarget.style.transform = 'scale(1)';
                } else {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.7)';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              {isPlaylistSaved ? (
                <Check size={18} strokeWidth={3} color="#000000" />
              ) : (
                <Plus size={18} strokeWidth={2.5} color="currentColor" />
              )}
            </button>
          )}

          {/* Pin Playlist to Top of Library Button */}
          {!isLikedView && (
            <button
              onClick={() => onTogglePinPlaylist && playlist && onTogglePinPlaylist(playlist)}
              title={isPlaylistPinned ? "Unpin playlist from Your Library" : "Pin playlist to top of Your Library"}
              style={{
                background: 'none',
                border: 'none',
                color: isPlaylistPinned ? '#1ed760' : 'var(--text-subdued)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                flexShrink: 0,
                transition: 'color 0.15s ease, transform 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = isPlaylistPinned ? '#1fdf64' : '#ffffff';
                e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = isPlaylistPinned ? '#1ed760' : 'var(--text-subdued)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <SpotifyPinIcon
                size={26}
                strokeWidth={2}
                fill={isPlaylistPinned ? '#1ed760' : 'none'}
                color={isPlaylistPinned ? '#1ed760' : 'currentColor'}
                filled={isPlaylistPinned}
              />
            </button>
          )}

          <button
            title="Download"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-subdued)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              transition: 'color 0.15s ease, transform 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.transform = 'scale(1.06)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-subdued)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <ArrowDownCircle size={32} strokeWidth={1.8} />
          </button>

          <button
            title="More options"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-subdued)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              transition: 'color 0.15s ease, transform 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.transform = 'scale(1.06)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-subdued)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <MoreHorizontal size={30} />
          </button>
        </div>

        {/* Track Table */}
        <div style={{ padding: '0 32px' }}>
          {/* Table Header */}
          <div
            className="track-table-header"
            style={{
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
              backgroundColor: scrolledPastHero ? '#1f1f1f' : 'var(--background-base)',
              transition: 'background-color 0.2s ease'
            }}
          >
            <span style={{ textAlign: 'center' }}>#</span>
            <span>Title</span>
            <span className="track-col-album">Album</span>
            <span className="track-col-date">Date added</span>
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '8px' }}>
              <Clock size={16} />
            </div>
          </div>

          {/* Table Rows */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {playlist.tracks.map((track, index) => {
              const isCurrent = Boolean(
                currentTrack && (
                  currentTrack.id === track.id ||
                  (currentTrack.title.trim().toLowerCase() === track.title.trim().toLowerCase() &&
                   currentTrack.artist.trim().toLowerCase() === track.artist.trim().toLowerCase())
                )
              );
              const isLiked = likedTrackIds.has(track.id);
              const isHovered = hoveredTrackIndex === index;

              return (
                <div
                  key={`${track.id}-${index}`}
                  className="track-table-row"
                  onClick={() => onPlayTrack(track, playlist.tracks, { id: playlist.id, title: playlist.title })}
                  onMouseEnter={() => setHoveredTrackIndex(index)}
                  onMouseLeave={() => setHoveredTrackIndex(null)}
                  style={{
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px' }}>
                    {isHovered ? (
                      isCurrent && isPlaying ? (
                        <SpotifyPauseIcon size={16} fill="#ffffff" onClick={(e) => { e.stopPropagation(); onTogglePlay(); }} />
                      ) : (
                        <SpotifyPlayIcon size={16} fill="#ffffff" onClick={(e) => { e.stopPropagation(); onPlayTrack(track, playlist.tracks, { id: playlist.id, title: playlist.title }); }} />
                      )
                    ) : isCurrent && isPlaying ? (
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '14px' }}>
                        <span className="spotify-eq-bar spotify-eq-1" />
                        <span className="spotify-eq-bar spotify-eq-2" />
                        <span className="spotify-eq-bar spotify-eq-3" />
                        <span className="spotify-eq-bar spotify-eq-4" />
                      </div>
                    ) : (
                      <span style={{ fontSize: '14px', color: isCurrent ? '#1ed760' : 'var(--text-subdued)' }}>
                        {index + 1}
                      </span>
                    )}
                  </div>

                  {/* Title & Artist */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', overflow: 'hidden' }}>
                    <img
                      src={getHighResImageUrl(track.coverUrl)}
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
                  <span className="track-col-album" style={{
                    fontSize: '13px',
                    color: 'var(--text-subdued)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {track.album}
                  </span>

                  {/* Date Added */}
                  <span className="track-col-date" style={{
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
  // Resolve card properties so user's real library playlist covers and titles ALWAYS take precedence
  const resolveCardProps = (item: HomeCardItem) => {
    const itemTitle = (item.title || '').toLowerCase().trim();
    const itemUri = (item.spotifyUri || item.id || '').replace('spotify:playlist:', '').replace('spotify:album:', '').toLowerCase().trim();

    const matched = playlists.find(p => {
      const pCleanId = (p.playlistId || p.id).replace('spotify:playlist:', '').replace('spotify:album:', '').toLowerCase().trim();
      if (itemUri && pCleanId === itemUri) return true;
      const pTitle = p.title.toLowerCase().trim();
      return pTitle === itemTitle || (itemTitle.length > 3 && pTitle.startsWith(itemTitle)) || (pTitle.length > 3 && itemTitle.startsWith(pTitle));
    });

    const displayImage = getHighResImageUrl((matched && matched.coverUrl) ? matched.coverUrl : item.image);
    const displayTitle = matched?.title || item.title;
    const resolvedItem: HomeCardItem = {
      ...item,
      title: displayTitle,
      image: displayImage,
      spotifyUri: matched ? (matched.playlistId || matched.id) : item.spotifyUri
    };

    return { matched, displayImage, displayTitle, resolvedItem };
  };

  const handleHomeCardClick = (item: HomeCardItem, autoPlay = true) => {
    if (onPlayPlaylistOrAlbum) {
      onPlayPlaylistOrAlbum(item, autoPlay);
      return;
    }

    const itemTitle = (item.title || '').toLowerCase().trim();
    const itemUri = (item.spotifyUri || item.id || '').replace('spotify:playlist:', '').replace('spotify:album:', '').toLowerCase().trim();

    // 1. If matches existing playlist by title or id:
    const matched = playlists.find(p => {
      const pCleanId = (p.playlistId || p.id).replace('spotify:playlist:', '').replace('spotify:album:', '').toLowerCase().trim();
      if (itemUri && pCleanId === itemUri) return true;
      const pTitle = p.title.toLowerCase().trim();
      return pTitle === itemTitle || (itemTitle.length > 3 && pTitle.startsWith(itemTitle)) || (pTitle.length > 3 && itemTitle.startsWith(pTitle));
    });

    if (matched) {
      if (autoPlay && matched.tracks.length > 0) {
        const startTrack = isShuffle
          ? matched.tracks[Math.floor(Math.random() * matched.tracks.length)]
          : matched.tracks[0];
        onPlayTrack(startTrack, matched.tracks, { id: matched.id, title: matched.title });
      }
      onSelectPlaylist(matched.id, autoPlay);
      return;
    }

    // 2. Otherwise pick random track from user's library or synthesized random track:
    if (allTracks.length > 0) {
      const randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)];
      onPlayTrack({
        ...randomTrack,
        title: item.title,
        artist: item.artistName || item.subtitle.split(',')[0] || randomTrack.artist,
        coverUrl: item.image || randomTrack.coverUrl
      }, allTracks, { id: 'home', title: item.title });
    } else {
      onPlayTrack({
        id: `home-${item.id}`,
        title: item.title,
        artist: item.artistName || item.subtitle.split(',')[0] || 'Featured Artist',
        album: item.title,
        duration: 180,
        coverUrl: item.image,
        gradient: item.badgeColor || '#1ed760'
      });
    }
  };

  const renderSectionHeader = (title: string, subtitle?: string) => (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {subtitle && (
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'var(--text-subdued)',
            marginBottom: '2px'
          }}>
            {subtitle}
          </span>
        )}
        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
          {title}
        </h2>
      </div>
      <button
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-subdued)',
          fontSize: '14px',
          fontWeight: 700,
          cursor: 'pointer',
          padding: '4px 0'
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subdued)')}
      >
        Show all
      </button>
    </div>
  );

  return (
    <div style={{
      background: 'linear-gradient(180deg, #4c1117 0%, rgba(18, 18, 18, 0.95) 280px, #121212 100%)',
      minHeight: '100%',
      padding: '24px 32px 64px 32px'
    }} className="animate-fade-in">
      {/* Filter Chips Bar (All, Music, Podcasts, Audiobooks) */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {(['all', 'music', 'podcasts', 'audiobooks'] as const).map(chip => {
          const isActive = activeChip === chip;
          return (
            <button
              key={chip}
              onClick={() => setActiveChip(chip)}
              style={{
                padding: '7px 16px',
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

      {/* Responsive Quick Access Grid (2 columns on compact/medium, 4 columns on wide) */}
      <div className="quick-access-grid">
        {quickAccessItems.map((item, index) => {
          const { displayImage, displayTitle, resolvedItem } = resolveCardProps(item);

          return (
            <div
              key={item.id || index}
              onClick={() => handleHomeCardClick(resolvedItem, false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '4px',
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color 0.2s ease',
                height: '48px'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.16)';
                const playBtn = e.currentTarget.querySelector('.quick-play-btn') as HTMLElement;
                if (playBtn) {
                  playBtn.style.opacity = '1';
                  playBtn.style.transform = 'scale(1)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                const playBtn = e.currentTarget.querySelector('.quick-play-btn') as HTMLElement;
                if (playBtn) {
                  playBtn.style.opacity = '0';
                  playBtn.style.transform = 'scale(0.9)';
                }
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                minWidth: '48px',
                minHeight: '48px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#282828',
                borderRadius: '4px 0 0 4px',
                flexShrink: 0
              }}>
                <img
                  src={displayImage}
                  alt={displayTitle}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    display: 'block'
                  }}
                />
              </div>
              <span style={{
                fontSize: '13px',
                fontWeight: 700,
                padding: '0 12px',
                flex: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: '#ffffff'
              }}>
                {displayTitle}
              </span>

              {/* Hover Floating Play Button */}
              <div
                className="quick-play-btn"
                onClick={e => {
                  e.stopPropagation();
                  handleHomeCardClick(resolvedItem, true);
                }}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#1ed760',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
                  marginRight: '8px',
                  opacity: 0,
                  transform: 'scale(0.9)',
                  transition: 'opacity 0.2s ease, transform 0.15s ease',
                  flexShrink: 0
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <SpotifyPlayIcon size={18} fill="#000000" />
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION 1: Made For Shreeji (Daily Mixes & Radar) */}
      <div style={{ marginBottom: '40px' }}>
        {renderSectionHeader(displayName, 'Made For')}
        <div className="spotify-card-grid">
          {MADE_FOR_YOU_ITEMS.map(item => (
            <div
              key={item.id}
              onClick={() => handleHomeCardClick(item)}
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
                const playBtn = e.currentTarget.querySelector('.mix-play-btn') as HTMLElement;
                if (playBtn) {
                  playBtn.style.opacity = '1';
                  playBtn.style.transform = 'translateY(0)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '#181818';
                const playBtn = e.currentTarget.querySelector('.mix-play-btn') as HTMLElement;
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
                marginBottom: '12px',
                borderRadius: '6px',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
              }}>
                <img
                  src={getHighResImageUrl(item.image)}
                  alt={item.title}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />

                {/* Daily Mix Badge */}
                {item.badgeNumber && (
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '8px',
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#ffffff' }}>Daily Mix</span>
                    <span style={{
                      backgroundColor: item.badgeColor || '#00d4ff',
                      color: '#000000',
                      borderRadius: '3px',
                      padding: '1px 4px',
                      fontSize: '11px',
                      fontWeight: 900
                    }}>
                      {item.badgeNumber}
                    </span>
                  </div>
                )}

                {/* Floating Play Button */}
                <button
                  className="mix-play-btn"
                  onClick={e => {
                    e.stopPropagation();
                    handleHomeCardClick(item, true);
                  }}
                  title={`Play ${item.title}`}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    bottom: '8px',
                    width: '46px',
                    height: '46px',
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
                    cursor: 'pointer',
                    zIndex: 2
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1fdf64')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1ed760')}
                >
                  <SpotifyPlayIcon size={20} fill="#000000" />
                </button>
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
                {item.title}
              </h3>
              <p style={{
                fontSize: '12px',
                color: 'var(--text-subdued)',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                margin: 0
              }}>
                {item.subtitle}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: Jump back in */}
      <div style={{ marginBottom: '40px' }}>
        {renderSectionHeader('Jump back in')}
        <div className="spotify-card-grid">
          {jumpBackInItems.map(item => {
            const { displayImage, displayTitle, resolvedItem } = resolveCardProps(item);

            return (
              <div
                key={item.id}
                onClick={() => handleHomeCardClick(resolvedItem)}
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
                  const playBtn = e.currentTarget.querySelector('.jump-play-btn') as HTMLElement;
                  if (playBtn) {
                    playBtn.style.opacity = '1';
                    playBtn.style.transform = 'translateY(0)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#181818';
                  const playBtn = e.currentTarget.querySelector('.jump-play-btn') as HTMLElement;
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
                  marginBottom: '12px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                }}>
                  <img
                    src={displayImage}
                    alt={displayTitle}
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
                    className="jump-play-btn"
                    onClick={e => {
                      e.stopPropagation();
                      handleHomeCardClick(resolvedItem, true);
                    }}
                    title={`Play ${displayTitle}`}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      bottom: '8px',
                      width: '46px',
                      height: '46px',
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
                    <SpotifyPlayIcon size={20} fill="#000000" />
                  </button>
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
                  {displayTitle}
                </h3>
                <p style={{
                  fontSize: '12px',
                  color: 'var(--text-subdued)',
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  margin: 0
                }}>
                  {item.subtitle}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Recents */}
      <div style={{ marginBottom: '40px' }}>
        {renderSectionHeader('Recents')}
        <div className="spotify-card-grid">
          {recentsItems.map(item => {
            const { displayImage, displayTitle, resolvedItem } = resolveCardProps(item);

            return (
              <div
                key={item.id}
                onClick={() => handleHomeCardClick(resolvedItem)}
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
                  const playBtn = e.currentTarget.querySelector('.recent-play-btn') as HTMLElement;
                  if (playBtn) {
                    playBtn.style.opacity = '1';
                    playBtn.style.transform = 'translateY(0)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#181818';
                  const playBtn = e.currentTarget.querySelector('.recent-play-btn') as HTMLElement;
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
                  marginBottom: '12px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                }}>
                  <img
                    src={displayImage}
                    alt={displayTitle}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />

                  {/* Progress bar for partially played tracks */}
                  {item.hasProgress && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      backgroundColor: 'rgba(255,255,255,0.2)'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${item.progressPercent || 50}%`,
                        backgroundColor: '#1ed760'
                      }} />
                    </div>
                  )}

                  {/* Floating Play Button */}
                  <button
                    className="recent-play-btn"
                    onClick={e => {
                      e.stopPropagation();
                      handleHomeCardClick(resolvedItem, true);
                    }}
                    title={`Play ${displayTitle}`}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      bottom: '8px',
                      width: '46px',
                      height: '46px',
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
                    <SpotifyPlayIcon size={20} fill="#000000" />
                  </button>
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
                  {displayTitle}
                </h3>
                <p style={{
                  fontSize: '12px',
                  color: 'var(--text-subdued)',
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  margin: 0
                }}>
                  {item.subtitle}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 4: Recommended Stations (Spotify Radio style) */}
      <div style={{ marginBottom: '40px' }}>
        {renderSectionHeader('Recommended Stations', 'Non-stop music based on your favorite songs and artists.')}
        <div className="spotify-card-grid">
          {RECOMMENDED_STATIONS.map(item => (
            <div
              key={item.id}
              onClick={() => handleHomeCardClick(item)}
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
                const playBtn = e.currentTarget.querySelector('.station-play-btn') as HTMLElement;
                if (playBtn) {
                  playBtn.style.opacity = '1';
                  playBtn.style.transform = 'translateY(0)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '#181818';
                const playBtn = e.currentTarget.querySelector('.station-play-btn') as HTMLElement;
                if (playBtn) {
                  playBtn.style.opacity = '0';
                  playBtn.style.transform = 'translateY(8px)';
                }
              }}
            >
              {/* Radio Card Artwork with colored pastel backdrop & circular artist cutout */}
              <div style={{
                position: 'relative',
                width: '100%',
                paddingBottom: '100%',
                marginBottom: '12px',
                borderRadius: '6px',
                overflow: 'hidden',
                backgroundColor: item.badgeColor || '#57e389',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  {/* Top Header: Spotify Logo / RADIO text */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: '#000000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: '2px solid #ffffff' }} />
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 900, color: '#000000', letterSpacing: '1px' }}>
                      RADIO
                    </span>
                  </div>

                  {/* Circular Artist Cutout */}
                  <div style={{
                    width: '74px',
                    height: '74px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    margin: '0 auto',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                    border: '2px solid rgba(255,255,255,0.4)'
                  }}>
                    <img
                      src={getHighResImageUrl(item.image)}
                      alt={item.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  {/* Station Title on card */}
                  <span style={{
                    fontSize: '16px',
                    fontWeight: 900,
                    color: '#000000',
                    lineHeight: 1.1,
                    letterSpacing: '-0.3px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {item.title}
                  </span>
                </div>

                {/* Floating Play Button */}
                <button
                  className="station-play-btn"
                  onClick={e => {
                    e.stopPropagation();
                    handleHomeCardClick(item, true);
                  }}
                  title={`Play ${item.title}`}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    bottom: '8px',
                    width: '46px',
                    height: '46px',
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
                  <SpotifyPlayIcon size={20} fill="#000000" />
                </button>
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
                {item.title}
              </h3>
              <p style={{
                fontSize: '12px',
                color: 'var(--text-subdued)',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                margin: 0
              }}>
                {item.subtitle}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 5: Your top mixes */}
      <div style={{ marginBottom: '40px' }}>
        {renderSectionHeader('Your top mixes')}
        <div className="spotify-card-grid">
          {TOP_MIXES.map(item => (
            <div
              key={item.id}
              onClick={() => handleHomeCardClick(item)}
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
                const playBtn = e.currentTarget.querySelector('.mix-card-play-btn') as HTMLElement;
                if (playBtn) {
                  playBtn.style.opacity = '1';
                  playBtn.style.transform = 'translateY(0)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '#181818';
                const playBtn = e.currentTarget.querySelector('.mix-card-play-btn') as HTMLElement;
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
                marginBottom: '12px',
                borderRadius: '6px',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
              }}>
                <img
                  src={getHighResImageUrl(item.image)}
                  alt={item.title}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />

                {/* Bottom colored banner strip */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '32px',
                  backgroundColor: item.badgeColor || '#ffd152',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 10px'
                }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 900,
                    color: '#000000',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {item.title}
                  </span>
                </div>

                {/* Floating Play Button */}
                <button
                  className="mix-card-play-btn"
                  onClick={e => {
                    e.stopPropagation();
                    handleHomeCardClick(item, true);
                  }}
                  title={`Play ${item.title}`}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    bottom: '8px',
                    width: '46px',
                    height: '46px',
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
                    cursor: 'pointer',
                    zIndex: 2
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1fdf64')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1ed760')}
                >
                  <SpotifyPlayIcon size={20} fill="#000000" />
                </button>
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
                {item.title}
              </h3>
              <p style={{
                fontSize: '12px',
                color: 'var(--text-subdued)',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                margin: 0
              }}>
                {item.subtitle}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 6: Recommended for today */}
      <div style={{ marginBottom: '40px' }}>
        {renderSectionHeader('Recommended for today', 'Inspired by your recent activity')}
        <div className="spotify-card-grid">
          {RECOMMENDED_FOR_TODAY.map(item => (
            <div
              key={item.id}
              onClick={() => handleHomeCardClick(item)}
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
                const playBtn = e.currentTarget.querySelector('.rec-play-btn') as HTMLElement;
                if (playBtn) {
                  playBtn.style.opacity = '1';
                  playBtn.style.transform = 'translateY(0)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '#181818';
                const playBtn = e.currentTarget.querySelector('.rec-play-btn') as HTMLElement;
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
                marginBottom: '12px',
                borderRadius: '6px',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
              }}>
                <img
                  src={getHighResImageUrl(item.image)}
                  alt={item.title}
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
                  className="rec-play-btn"
                  onClick={e => {
                    e.stopPropagation();
                    handleHomeCardClick(item, true);
                  }}
                  title={`Play ${item.title}`}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    bottom: '8px',
                    width: '46px',
                    height: '46px',
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
                  <SpotifyPlayIcon size={20} fill="#000000" />
                </button>
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
                {item.title}
              </h3>
              <p style={{
                fontSize: '12px',
                color: 'var(--text-subdued)',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                margin: 0
              }}>
                {item.subtitle}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 7: Large Featured Cards (Atmospheric Canvas Cards) */}
      <div style={{ marginBottom: '24px' }}>
        <div className="quick-access-grid" style={{ gap: '18px' }}>
          {FEATURED_RADIO_CARDS.map(item => (
            <div key={item.id} style={{ display: 'flex', flexDirection: 'column' }}>
              {item.topSubtitle && (
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#b3b3b3',
                  marginBottom: '10px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {item.topSubtitle}
                </div>
              )}
              <div
                onClick={() => handleHomeCardClick(item)}
                style={{
                  position: 'relative',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  height: '320px',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '20px',
                  transition: 'transform 0.2s ease',
                  flex: 1
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  const playBtn = e.currentTarget.querySelector('.featured-play-btn') as HTMLElement;
                  if (playBtn) {
                    playBtn.style.opacity = '1';
                    playBtn.style.transform = 'translateY(0)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  const playBtn = e.currentTarget.querySelector('.featured-play-btn') as HTMLElement;
                  if (playBtn) {
                    playBtn.style.opacity = '0';
                    playBtn.style.transform = 'translateY(8px)';
                  }
                }}
              >
                {/* Background Artwork */}
                <img
                  src={getHighResImageUrl(item.image)}
                  alt={item.title}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    zIndex: 0
                  }}
                />
                {/* Dark Gradient Overlay */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.85) 100%)',
                  zIndex: 1
                }} />

                {/* Top Content */}
                <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column' }}>
                  <span style={{
                    fontSize: '22px',
                    fontWeight: 800,
                    color: '#ffffff',
                    letterSpacing: '-0.5px'
                  }}>
                    {item.title}
                  </span>
                </div>

                {/* Bottom Content & Play Button */}
                <div style={{
                  position: 'relative',
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between'
                }}>
                  <span style={{
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    lineHeight: 1.4,
                    maxWidth: '75%'
                  }}>
                    {item.subtitle}
                  </span>

                  <button
                    className="featured-play-btn"
                    onClick={e => {
                      e.stopPropagation();
                      handleHomeCardClick(item, true);
                    }}
                    title={`Play ${item.title}`}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: '#1ed760',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                      opacity: 0,
                      transform: 'translateY(8px)',
                      transition: 'opacity 0.2s ease, transform 0.2s ease, background-color 0.15s ease',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1fdf64')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1ed760')}
                  >
                    <SpotifyPlayIcon size={22} fill="#000000" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
