import React, { useState } from 'react';
import { Library, Plus, ArrowRight, Heart, Search, ListFilter, Download } from 'lucide-react';
import { Playlist } from '../types';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string, playlistId?: string) => void;
  playlists: Playlist[];
  selectedPlaylistId: string | null;
  likedCount: number;
  onImportPlaylist: (url: string) => Promise<boolean>;
  onOpenSyncModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  playlists,
  selectedPlaylistId,
  likedCount,
  onImportPlaylist,
  onOpenSyncModal
}) => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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

  const filteredPlaylists = filterQuery.trim()
    ? playlists.filter(p => p.title.toLowerCase().includes(filterQuery.toLowerCase()))
    : playlists;

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      height: '100%',
      backgroundColor: 'var(--background-base)',
      borderRadius: 'var(--panel-radius)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0,
      position: 'relative'
    }}>
      {/* 1. Library Header */}
      <div style={{
        padding: '16px 16px 8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: 'var(--text-subdued)'
      }}>
        <div
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
            title="Show more"
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
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* 2. Filter Pills */}
      <div style={{ padding: '8px 16px', display: 'flex', gap: '8px' }}>
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

      {/* 3. Search & Sort Row */}
      <div style={{
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: 'var(--text-subdued)'
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

      {/* 4. Playlists Scroll List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        {/* Liked Songs Entry - Only displayed if user has liked at least 1 song */}
        {likedCount > 0 && (
          <div
            onClick={() => onSelectView('liked')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px',
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
              color: '#ffffff',
              flexShrink: 0
            }}>
              <Heart size={20} fill="#ffffff" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-base)' }}>Liked Songs</span>
              <span style={{ fontSize: '12px', color: 'var(--text-subdued)' }}>Playlist • {likedCount} song{likedCount === 1 ? '' : 's'}</span>
            </div>
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

        {filteredPlaylists.map(pl => {
          const isSelected = currentView === 'playlist' && selectedPlaylistId === pl.id;
          return (
            <div
              key={pl.id}
              onClick={() => onSelectView('playlist', pl.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px',
                borderRadius: 'var(--card-radius)',
                cursor: 'pointer',
                backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={e => {
                if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              }}
              onMouseLeave={e => {
                if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <img
                src={pl.coverUrl}
                alt={pl.title}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '4px',
                  objectFit: 'cover',
                  flexShrink: 0
                }}
              />
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
                <span style={{ fontSize: '12px', color: 'var(--text-subdued)' }}>
                  Playlist • Spotify
                </span>
              </div>
            </div>
          );
        })}
      </div>

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
