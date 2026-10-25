import React, { useState, useEffect } from 'react';
import { Library, Plus, ArrowLeft, Heart, Search, ListFilter, Download, Pin } from 'lucide-react';
import { Playlist } from '../types';
import { SpotifyUserProfile } from '../spotifyApi';
import { getHighResImageUrl } from '../utils/imageUtils';
import { SpotifyPlayIcon } from './SpotifyIcons';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string, playlistId?: string) => void;
  playlists: Playlist[];
  selectedPlaylistId: string | null;
  likedCount: number;
  onImportPlaylist: (url: string) => Promise<boolean>;
  onOpenSyncModal?: () => void;
  onPlayPlaylist?: (playlist: Playlist, autoPlay?: boolean) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  pinnedPlaylistIds?: string[];
  onTogglePinPlaylist?: (playlist: Playlist) => void;
  userProfile?: SpotifyUserProfile | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  playlists,
  selectedPlaylistId,
  likedCount,
  onImportPlaylist,
  onOpenSyncModal,
  onPlayPlaylist,
  isCollapsed = false,
  onToggleCollapse,
  pinnedPlaylistIds = [],
  onTogglePinPlaylist,
  userProfile
}) => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; playlist: Playlist } | null>(null);

  useEffect(() => {
    const handleClose = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', handleClose);
      return () => window.removeEventListener('click', handleClose);
    }
  }, [contextMenu]);

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importInput.trim()) return;
    setIsImporting(true);
    setImportError('');
    const success = await onImportPlaylist(importInput.trim());
    setIsImporting(false);
    if (success) {
      setImportInput('');
      setShowImportModal(false);
    } else {
      setImportError('Failed to load playlist. Please verify the link or URI.');
    }
  };

  const pinnedSet = new Set(
    (pinnedPlaylistIds || []).map(id => id.replace('spotify:playlist:', '').replace('spotify:album:', ''))
  );

  const isItemPinned = (pl: Playlist) => {
    const cleanId = (pl.playlistId || pl.id).replace('spotify:playlist:', '').replace('spotify:album:', '');
    return pinnedSet.has(cleanId) || (pinnedPlaylistIds || []).includes(pl.id);
  };

  const filteredPlaylists = filterQuery.trim()
    ? playlists.filter(p => p.title.toLowerCase().includes(filterQuery.toLowerCase()))
    : playlists;

  // Pin playlists to the very top, respecting pinned order
  const pinnedPlaylists: Playlist[] = [];
  for (const pid of (pinnedPlaylistIds || [])) {
    const cleanPid = pid.replace('spotify:playlist:', '').replace('spotify:album:', '');
    const found = filteredPlaylists.find(p => {
      const pClean = (p.playlistId || p.id).replace('spotify:playlist:', '').replace('spotify:album:', '');
      return p.id === pid || pClean === cleanPid;
    });
    if (found && !pinnedPlaylists.some(p => p.id === found.id)) {
      pinnedPlaylists.push(found);
    }
  }

  const unpinnedPlaylists = filteredPlaylists.filter(p => !isItemPinned(p));
  const sortedDisplayPlaylists = [...pinnedPlaylists, ...unpinnedPlaylists];

  return (
    <aside style={{
      width: isCollapsed ? 'var(--sidebar-collapsed-width, 72px)' : 'var(--sidebar-width)',
      height: '100%',
      backgroundColor: 'var(--background-base)',
      borderRadius: 'var(--panel-radius)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0,
      position: 'relative',
      transition: 'width 0.2s cubic-bezier(0.3, 0, 0, 1)'
    }}>
      {/* 1. Library Header */}
      {isCollapsed ? (
        <div style={{
          padding: '16px 12px 10px 12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          color: 'var(--text-subdued)',
          flexShrink: 0
        }}>
          <div
            onClick={onToggleCollapse}
            title="Expand Your Library"
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '50%',
              color: 'inherit',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.backgroundColor = 'var(--background-elevated-base)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-subdued)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Library size={24} />
          </div>

          <button
            onClick={() => setShowImportModal(true)}
            title="Create playlist or folder"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              borderRadius: '50%',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--background-elevated-base)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-subdued)';
            }}
          >
            <Plus size={20} />
          </button>
        </div>
      ) : (
        <div style={{
          padding: '16px 16px 8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: 'var(--text-subdued)',
          flexShrink: 0
        }}>
          <div
            onClick={onToggleCollapse}
            title="Collapse Your Library"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '16px',
              color: 'inherit',
              transition: 'color 0.15s ease'
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subdued)')}
          >
            <Library size={24} />
            <span>Your Library</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setShowImportModal(true)}
              title="Create playlist or folder"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                borderRadius: '50%',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--background-elevated-base)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-subdued)';
              }}
            >
              <Plus size={20} />
            </button>

            <button
              onClick={onToggleCollapse}
              title="Collapse Your Library"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                borderRadius: '50%',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--background-elevated-base)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-subdued)';
              }}
            >
              <ArrowLeft size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 2. Filter Pills (Only shown when expanded) */}
      {!isCollapsed && (
        <div style={{ padding: '8px 16px', display: 'flex', gap: '8px', flexShrink: 0 }}>
          {['Playlists', 'Artists', 'Albums'].map(pill => (
            <button
              key={pill}
              style={{
                fontSize: '13px',
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: '500px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
            >
              {pill}
            </button>
          ))}
        </div>
      )}

      {/* 3. Search & Sort Row (Only shown when expanded) */}
      {!isCollapsed && (
        <div style={{
          padding: '6px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: 'var(--text-subdued)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              title="Search in Your Library"
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex'
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subdued)')}
            >
              <Search size={18} />
            </button>

            {isSearchOpen && (
              <input
                type="text"
                autoFocus
                placeholder="Search in Your Library"
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  color: '#ffffff',
                  fontSize: '12px',
                  outline: 'none',
                  width: '140px'
                }}
              />
            )}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer'
          }}>
            <span>Recents</span>
            <ListFilter size={14} />
          </div>
        </div>
      )}

      {/* 4. Playlists Scroll List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isCollapsed ? '4px 0' : '4px 8px' }}>
        {/* Liked Songs Entry - Only displayed if user has liked at least 1 song */}
        {likedCount > 0 && (
          <div
            onClick={() => onSelectView('liked')}
            title={isCollapsed ? 'Liked Songs' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: '12px',
              padding: isCollapsed ? '8px 0' : '8px',
              borderRadius: 'var(--card-radius)',
              cursor: 'pointer',
              backgroundColor: currentView === 'liked' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={e => {
              if (currentView !== 'liked') e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={e => {
              if (currentView !== 'liked') e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '4px',
              background: 'linear-gradient(135deg, #450af5, #c4efd9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Heart size={20} fill="#ffffff" color="#ffffff" />
            </div>
            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden' }}>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: currentView === 'liked' ? '#1ed760' : 'var(--text-base)',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}>
                  Liked Songs
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-subdued)' }}>
                  Playlist • {likedCount} {likedCount === 1 ? 'song' : 'songs'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* User Playlists */}
        {/* Empty Playlists State */}
        {filteredPlaylists.length === 0 && (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-subdued)' }}>
            <p style={{ fontSize: '13px', marginBottom: '14px', lineHeight: 1.4 }}>
              Sync your Spotify account to load all your playlists and music automatically.
            </p>
            {onOpenSyncModal && (
              <button
                onClick={onOpenSyncModal}
                style={{
                  backgroundColor: '#1ed760',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '500px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Sync Spotify Account
              </button>
            )}
          </div>
        )}

        {sortedDisplayPlaylists.map(pl => {
          const isSelected = currentView === 'playlist' && selectedPlaylistId === pl.id;
          const isPinned = isItemPinned(pl);
          return (
            <div
              key={pl.id}
              onClick={() => onSelectView('playlist', pl.id)}
              onContextMenu={e => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, playlist: pl });
              }}
              title={isCollapsed ? `${pl.title}${isPinned ? ' (Pinned)' : ''}` : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: '12px',
                padding: isCollapsed ? '8px 0' : '8px',
                borderRadius: 'var(--card-radius)',
                cursor: 'pointer',
                backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={e => {
                if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                const playBtn = e.currentTarget.querySelector('.sidebar-item-play-btn') as HTMLElement;
                if (playBtn) playBtn.style.opacity = '1';
              }}
              onMouseLeave={e => {
                if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                const playBtn = e.currentTarget.querySelector('.sidebar-item-play-btn') as HTMLElement;
                if (playBtn) playBtn.style.opacity = '0';
              }}
            >
              <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
                <img
                  src={getHighResImageUrl(pl.coverUrl)}
                  alt={pl.title}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '4px',
                    objectFit: 'cover'
                  }}
                />
                {isCollapsed && isPinned && (
                  <div
                    title="Pinned playlist"
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Pin size={8} fill="#1ed760" color="#1ed760" style={{ transform: 'rotate(-45deg)' }} />
                  </div>
                )}
                <button
                  className="sidebar-item-play-btn"
                  onClick={e => {
                    e.stopPropagation();
                    if (onPlayPlaylist) {
                      onPlayPlaylist(pl, true);
                    } else {
                      onSelectView('playlist', pl.id);
                    }
                  }}
                  title={`Play ${pl.title}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '48px',
                    height: '48px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(0,0,0,0.65)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.15s ease',
                    cursor: 'pointer'
                  }}
                >
                  <SpotifyPlayIcon size={20} fill="#ffffff" />
                </button>
              </div>
              {!isCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden' }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: isSelected ? '#1ed760' : 'var(--text-base)',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden'
                  }}>
                    {pl.title}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-subdued)' }}>
                    {isPinned && (
                      <Pin
                        size={12}
                        fill="#1ed760"
                        color="#1ed760"
                        style={{
                          transform: 'rotate(-45deg)',
                          flexShrink: 0
                        }}
                      />
                    )}
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Playlist • {pl.author || userProfile?.name || 'Spotify'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Context Menu for Pin/Unpin */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: Math.min(contextMenu.y, window.innerHeight - 80),
            left: Math.min(contextMenu.x, window.innerWidth - 180),
            backgroundColor: '#282828',
            borderRadius: '4px',
            padding: '4px',
            boxShadow: '0 16px 24px rgba(0,0,0,0.6)',
            zIndex: 9999,
            minWidth: '170px'
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => {
              if (onTogglePinPlaylist) onTogglePinPlaylist(contextMenu.playlist);
              setContextMenu(null);
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '2px',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left'
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Pin
              size={15}
              fill={isItemPinned(contextMenu.playlist) ? '#1ed760' : 'none'}
              color={isItemPinned(contextMenu.playlist) ? '#1ed760' : 'currentColor'}
              style={{ transform: 'rotate(-45deg)' }}
            />
            {isItemPinned(contextMenu.playlist) ? 'Unpin playlist' : 'Pin playlist'}
          </button>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.88)',
          backdropFilter: 'blur(10px)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Import Spotify Playlist</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-subdued)', marginBottom: '16px' }}>
            Paste any Spotify playlist link or URI to import tracks and metadata.
          </p>

          <form onSubmit={handleImportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="text"
              placeholder="https://open.spotify.com/playlist/... or spotify:playlist:..."
              value={importInput}
              onChange={e => setImportInput(e.target.value)}
              style={{
                backgroundColor: '#242424',
                border: '1px solid #333',
                borderRadius: '6px',
                padding: '10px 14px',
                color: '#ffffff',
                fontSize: '13px',
                outline: 'none'
              }}
            />

            {importError && (
              <span style={{ color: '#ef4444', fontSize: '12px' }}>{importError}</span>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-subdued)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '8px 12px'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isImporting}
                style={{
                  backgroundColor: '#1ed760',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '500px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isImporting ? 'not-allowed' : 'pointer',
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Download size={14} />
                <span>{isImporting ? 'Importing...' : 'Import'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </aside>
  );
};
