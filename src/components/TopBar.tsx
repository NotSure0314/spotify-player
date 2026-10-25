import React from 'react';
import { Search, Bell, Users, FolderHeart, RefreshCw, Sparkles } from 'lucide-react';
import { SpotifyUserProfile } from '../spotifyApi';
import { SpotifyLogo } from './SpotifyLogo';
import { SpotifyHomeIcon } from './SpotifyHomeIcon';

interface TopBarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  userProfile: SpotifyUserProfile | null;
  onOpenSyncModal: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  onSelectView,
  searchQuery,
  onSearchChange,
  userProfile,
  onOpenSyncModal
}) => {
  return (
    <header style={{
      height: 'var(--top-bar-height)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      backgroundColor: '#000000',
      position: 'relative',
      zIndex: 100,
      flexShrink: 0
    }}>
      {/* Left: Spotify Logo */}
      <div
        onClick={() => onSelectView('home')}
        title="Spotify"
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          padding: '4px',
          transition: 'transform 0.15s ease',
          zIndex: 2
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <SpotifyLogo size={32} color="#ffffff" />
      </div>

      {/* Center: Spotify Home + Pill Search Bar (Exactly Centered in Viewport) */}
      <div style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: 'calc(100% - 460px)',
        maxWidth: '520px',
        minWidth: '320px',
        zIndex: 1
      }}>
        {/* Home Button (Circle) */}
        <button
          onClick={() => onSelectView('home')}
          title="Home"
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#1f1f1f',
            border: 'none',
            color: currentView === 'home' ? '#ffffff' : '#b3b3b3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.04)';
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.backgroundColor = '#282828';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.color = currentView === 'home' ? '#ffffff' : '#b3b3b3';
            e.currentTarget.style.backgroundColor = '#1f1f1f';
          }}
        >
          <SpotifyHomeIcon size={24} />
        </button>

        {/* Search Pill Input */}
        <div
          onClick={() => {
            if (currentView !== 'search') onSelectView('search');
          }}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            height: '48px',
            backgroundColor: '#1f1f1f',
            borderRadius: '500px',
            padding: '0 16px',
            gap: '12px',
            cursor: 'text',
            transition: 'background-color 0.15s ease, border-color 0.15s ease',
            border: currentView === 'search' ? '2px solid #ffffff' : '1px solid transparent'
          }}
          onMouseEnter={e => {
            if (currentView !== 'search') e.currentTarget.style.backgroundColor = '#2a2a2a';
          }}
          onMouseLeave={e => {
            if (currentView !== 'search') e.currentTarget.style.backgroundColor = '#1f1f1f';
          }}
        >
          <Search size={22} color="#b3b3b3" />
          <input
            type="text"
            placeholder="What do you want to play?"
            value={searchQuery}
            onChange={e => {
              if (currentView !== 'search') onSelectView('search');
              onSearchChange(e.target.value);
            }}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 500
            }}
          />
          <div style={{ borderLeft: '1px solid #3e3e3e', paddingLeft: '12px', display: 'flex', alignItems: 'center' }}>
            <FolderHeart size={20} color="#b3b3b3" />
          </div>
        </div>
      </div>

      {/* Right: Sync User, Notifications, Profile */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginLeft: 'auto',
        zIndex: 2
      }}>
        {userProfile ? (
          <button
            onClick={onOpenSyncModal}
            title="Click to change or re-sync Spotify account"
            style={{
              background: '#242424',
              border: '1px solid #383838',
              borderRadius: '500px',
              padding: '4px 12px 4px 6px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              color: '#ffffff',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#2e2e2e';
              e.currentTarget.style.borderColor = '#1ed760';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#242424';
              e.currentTarget.style.borderColor = '#383838';
            }}
          >
            {userProfile.avatar ? (
              <img
                src={userProfile.avatar}
                alt={userProfile.name}
                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: '#1ed760',
                color: '#000000',
                fontWeight: 700,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.1 }}>{userProfile.name}</span>
              <span style={{ fontSize: '10px', color: '#1ed760', fontWeight: 600 }}>Synced</span>
            </div>
            <RefreshCw size={12} color="#888" style={{ marginLeft: '4px' }} />
          </button>
        ) : (
          <button
            onClick={onOpenSyncModal}
            style={{
              backgroundColor: '#1ed760',
              color: '#000000',
              border: 'none',
              borderRadius: '500px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'transform 0.15s ease, background-color 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.04)';
              e.currentTarget.style.backgroundColor = '#22e466';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.backgroundColor = '#1ed760';
            }}
          >
            <Sparkles size={15} />
            <span>Sync Spotify</span>
          </button>
        )}

        <button
          title="What's New"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#1f1f1f',
            border: 'none',
            color: '#b3b3b3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={e => (e.currentTarget.style.color = '#b3b3b3')}
        >
          <Bell size={18} />
        </button>

        <button
          title="Friend Activity"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#1f1f1f',
            border: 'none',
            color: '#b3b3b3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={e => (e.currentTarget.style.color = '#b3b3b3')}
        >
          <Users size={18} />
        </button>
      </div>
    </header>
  );
};
