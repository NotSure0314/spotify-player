import React, { useState } from 'react';
import { X, Sparkles, User, AlertCircle, ArrowRight } from 'lucide-react';
import { SpotifyLogo } from './SpotifyLogo';

interface SyncUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncUser: (username: string) => Promise<boolean>;
  currentUsername?: string;
}

export const SyncUserModal: React.FC<SyncUserModalProps> = ({
  isOpen,
  onClose,
  onSyncUser,
  currentUsername
}) => {
  const [usernameInput, setUsernameInput] = useState(currentUsername || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const success = await onSyncUser(usernameInput.trim());
      if (success) {
        onClose();
      } else {
        setError('No public playlists found for this Spotify user. Make sure your playlists are public.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to sync with Spotify. Please check the username or link.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (name: string) => {
    setUsernameInput(name);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#181818',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '480px',
        padding: '32px',
        border: '1px solid #282828',
        boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: '#b3b3b3',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={e => (e.currentTarget.style.color = '#b3b3b3')}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: '#1ed760',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000000',
            flexShrink: 0
          }}>
            <SpotifyLogo size={26} color="#000000" />
          </div>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Sync Spotify Account
            </h2>
            <p style={{ fontSize: '13px', color: '#b3b3b3', margin: '4px 0 0 0' }}>
              Import all your public playlists, tracks & album covers
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
              Spotify Username or Profile URL
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#242424',
              borderRadius: '8px',
              padding: '0 14px',
              border: error ? '1px solid #ef4444' : '1px solid #333'
            }}>
              <User size={18} color="#777" />
              <input
                type="text"
                placeholder="e.g. spotify or your_spotify_username"
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              />
            </div>
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Quick Shortcuts */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '8px' }}>
              Quick Suggestions
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleQuickSelect('spotify')}
                style={{
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #3e3e3e',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: '500px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#383838')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#2a2a2a')}
              >
                <Sparkles size={12} color="#1ed760" />
                <span>Spotify Official</span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !usernameInput.trim()}
            style={{
              width: '100%',
              backgroundColor: loading || !usernameInput.trim() ? '#1a7538' : '#1ed760',
              color: '#000000',
              border: 'none',
              borderRadius: '500px',
              padding: '14px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: loading || !usernameInput.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'transform 0.15s ease, background-color 0.15s ease'
            }}
            onMouseEnter={e => {
              if (!loading && usernameInput.trim()) {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.backgroundColor = '#22e466';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.backgroundColor = loading || !usernameInput.trim() ? '#1a7538' : '#1ed760';
            }}
          >
            {loading ? (
              <span>Syncing Playlists...</span>
            ) : (
              <>
                <span>Import & Sync Playlists</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
