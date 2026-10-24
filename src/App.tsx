import { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { MainContent } from './components/MainContent';
import { NowPlayingBar } from './components/NowPlayingBar';
import { RightPanel } from './components/RightPanel';
import { SyncUserModal } from './components/SyncUserModal';
import { Track, Playlist, RepeatMode } from './types';
import { audioEngine } from './audioEngine';
import {
  fetchUserProfile,
  fetchLivePlaylistDetails,
  searchSpotifyCatalog,
  importSpotifyPlaylist,
  getSavedUserProfile,
  SpotifyUserProfile
} from './spotifyApi';

export function App() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<SpotifyUserProfile | null>(getSavedUserProfile());
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  // Player state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.75);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(new Set());

  // Auxiliary panels
  const [isLyricsOpen, setIsLyricsOpen] = useState<boolean>(false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);

  const mainScrollRef = useRef<HTMLDivElement>(null);
  const repeatModeRef = useRef<RepeatMode>(repeatMode);
  repeatModeRef.current = repeatMode;

  // 1. Audio Engine Callbacks Setup
  useEffect(() => {
    audioEngine.onTimeUpdate((current) => {
      setProgress(current);
    });

    audioEngine.onTrackEnded(() => {
      if (repeatModeRef.current === 'one') {
        setProgress(0);
        audioEngine.seek(0);
        audioEngine.resume();
      } else {
        handleNext();
      }
    });

    audioEngine.setVolume(volume);
  }, []);

  // 2. Initial Load: Sync User Playlists
  useEffect(() => {
    async function initUser() {
      const saved = getSavedUserProfile();
      const targetUser = saved?.id || 'gqfy40kjxlg18x0ygxux5ramv';
      try {
        const result = await fetchUserProfile(targetUser);
        if (result && result.playlists.length > 0) {
          setUserProfile(result.user);
          // Fetch full track list with real album covers for the first playlist
          const firstDetails = await fetchLivePlaylistDetails(result.playlists[0].id);
          const fullPlaylists = result.playlists.map((p, idx) =>
            idx === 0 && firstDetails
              ? { ...p, tracks: firstDetails.tracks, coverUrl: firstDetails.coverUrl || p.coverUrl }
              : p
          );

          setPlaylists(fullPlaylists);
          setSelectedPlaylistId(fullPlaylists[0].id);
          if (firstDetails?.tracks?.length) {
            setCurrentTrack(firstDetails.tracks[0]);
          }
        }
      } catch (err) {
        console.warn('Initial sync fallback:', err);
      }
    }
    initUser();
  }, []);

  // 3. Sync User Handler (called from Sync Modal)
  const handleSyncUser = async (username: string): Promise<boolean> => {
    try {
      const result = await fetchUserProfile(username);
      if (!result || result.playlists.length === 0) {
        return false;
      }

      setUserProfile(result.user);

      // Load full tracks and real album covers for the first playlist
      const firstDetails = await fetchLivePlaylistDetails(result.playlists[0].id);
      const fullPlaylists = result.playlists.map((p, idx) =>
        idx === 0 && firstDetails
          ? { ...p, tracks: firstDetails.tracks, coverUrl: firstDetails.coverUrl || p.coverUrl }
          : p
      );

      setPlaylists(fullPlaylists);
      setSelectedPlaylistId(fullPlaylists[0].id);
      setCurrentView('home');

      if (firstDetails?.tracks?.length) {
        setCurrentTrack(firstDetails.tracks[0]);
      }
      return true;
    } catch (err) {
      console.error('Failed to sync user:', err);
      throw err;
    }
  };

  // 4. Debounced Live Catalog Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchSpotifyCatalog(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Selected playlist object
  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId) || playlists[0] || null;

  // If selecting a playlist without loaded tracks, fetch them
  useEffect(() => {
    if (selectedPlaylistId) {
      const currentPl = playlists.find(p => p.id === selectedPlaylistId);
      if (currentPl && currentPl.tracks.length === 0) {
        fetchLivePlaylistDetails(selectedPlaylistId).then(details => {
          if (details && details.tracks.length > 0) {
            setPlaylists(prev =>
              prev.map(p => (p.id === selectedPlaylistId ? { ...p, tracks: details.tracks, coverUrl: details.coverUrl || p.coverUrl } : p))
            );
          }
        });
      }
    }
  }, [selectedPlaylistId, playlists]);

  // All tracks from user's loaded library
  const allTracks = playlists.flatMap(p => p.tracks);

  // Queue tracks
  const queueTracks = currentTrack ? allTracks.filter(t => t.id !== currentTrack.id) : allTracks;

  // Volume Engine Sync
  useEffect(() => {
    audioEngine.setVolume(volume);
  }, [volume]);

  // 5. MediaSession API Integration
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
        artwork: [{ src: currentTrack.coverUrl, sizes: '300x300', type: 'image/jpeg' }]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        setIsPlaying(true);
        audioEngine.resume();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        setIsPlaying(false);
        audioEngine.pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', handlePrevious);
      navigator.mediaSession.setActionHandler('nexttrack', handleNext);
    }
  }, [currentTrack]);

  // 6. Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handlePrevious();
      } else if (e.code === 'ArrowRight' && currentTrack) {
        e.preventDefault();
        handleSeek(Math.min(currentTrack.duration, progress + 5));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(Math.max(0, progress - 5));
      } else if (e.key.toLowerCase() === 'm') {
        setVolume(v => (v > 0 ? 0 : 0.75));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, progress, currentTrack]);

  // Playback Handlers
  const togglePlay = () => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      if (currentTrack) {
        audioEngine.resume();
        setIsPlaying(true);
      }
    }
  };

  const handlePlayTrack = (track: Track) => {
    setCurrentTrack(track);
    setProgress(0);
    setIsPlaying(true);
    audioEngine.playTrack(track);
  };

  const handleNext = () => {
    const activeList = selectedPlaylist?.tracks?.length ? selectedPlaylist.tracks : allTracks;
    if (activeList.length === 0) return;

    const currentIndex = currentTrack ? activeList.findIndex(t => t.id === currentTrack.id) : -1;

    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * activeList.length);
      handlePlayTrack(activeList[randomIndex]);
    } else {
      const nextIndex = (currentIndex + 1) % activeList.length;
      handlePlayTrack(activeList[nextIndex]);
    }
  };

  const handlePrevious = () => {
    if (progress > 3) {
      setProgress(0);
      audioEngine.seek(0);
      return;
    }
    const activeList = selectedPlaylist?.tracks?.length ? selectedPlaylist.tracks : allTracks;
    if (activeList.length === 0) return;

    const currentIndex = currentTrack ? activeList.findIndex(t => t.id === currentTrack.id) : 0;
    const prevIndex = (currentIndex - 1 + activeList.length) % activeList.length;
    handlePlayTrack(activeList[prevIndex]);
  };

  const handleSeek = (seconds: number) => {
    setProgress(seconds);
    audioEngine.seek(seconds);
  };

  const cycleRepeat = () => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  const toggleLikeTrack = (trackId: string) => {
    setLikedTrackIds(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  };

  // Import Playlist Handler
  const handleImportPlaylist = async (url: string): Promise<boolean> => {
    const imported = await importSpotifyPlaylist(url);
    if (!imported) return false;

    setPlaylists(prev => [imported, ...prev]);
    setSelectedPlaylistId(imported.id);
    setCurrentView('playlist');
    return true;
  };

  // View Navigation
  const handleSelectView = (view: string, playlistId?: string) => {
    if (playlistId) {
      setSelectedPlaylistId(playlistId);
    }
    setCurrentView(view);
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#000000',
      overflow: 'hidden'
    }}>
      {/* 1. Spotify Full-Width Top Bar (Navigation, Search & Sync) */}
      <TopBar
        currentView={currentView}
        onSelectView={handleSelectView}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        userProfile={userProfile}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
      />

      {/* 2. Middle Panels Area (Library + Main View + Optional Right Panel) */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        padding: '0 8px 8px 8px',
        gap: '8px'
      }}>
        {/* Left Sidebar ("Your Library") */}
        <Sidebar
          currentView={currentView}
          onSelectView={handleSelectView}
          playlists={playlists}
          selectedPlaylistId={selectedPlaylistId}
          likedCount={likedTrackIds.size}
          onImportPlaylist={handleImportPlaylist}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
        />

        {/* Center Main Viewport */}
        <main
          ref={mainScrollRef}
          style={{
            flex: 1,
            height: '100%',
            backgroundColor: 'var(--background-base)',
            borderRadius: 'var(--panel-radius)',
            overflowY: 'auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <MainContent
            currentView={currentView}
            selectedPlaylist={selectedPlaylist}
            onSelectPlaylist={id => handleSelectView('playlist', id)}
            playlists={playlists}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onPlayTrack={handlePlayTrack}
            onTogglePlay={togglePlay}
            likedTrackIds={likedTrackIds}
            onToggleLikeTrack={toggleLikeTrack}
            searchQuery={searchQuery}
            searchResults={searchResults}
            isSearching={isSearching}
            allTracks={allTracks}
          />
        </main>

        {/* Right Panel (Lyrics / Queue) */}
        <RightPanel
          currentTrack={currentTrack}
          isLyricsOpen={isLyricsOpen}
          onCloseLyrics={() => setIsLyricsOpen(false)}
          isQueueOpen={isQueueOpen}
          onCloseQueue={() => setIsQueueOpen(false)}
          queue={queueTracks}
          progress={progress}
          onPlayTrack={handlePlayTrack}
        />
      </div>

      {/* 3. Bottom Player Bar */}
      <NowPlayingBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onNext={handleNext}
        onPrevious={handlePrevious}
        progress={progress}
        onSeek={handleSeek}
        volume={volume}
        onVolumeChange={setVolume}
        isShuffle={isShuffle}
        onToggleShuffle={() => setIsShuffle(prev => !prev)}
        repeatMode={repeatMode}
        onCycleRepeat={cycleRepeat}
        isLiked={currentTrack ? likedTrackIds.has(currentTrack.id) : false}
        onToggleLike={() => {
          if (currentTrack) toggleLikeTrack(currentTrack.id);
        }}
        isLyricsOpen={isLyricsOpen}
        onToggleLyrics={() => {
          setIsLyricsOpen(prev => !prev);
          setIsQueueOpen(false);
        }}
        isQueueOpen={isQueueOpen}
        onToggleQueue={() => {
          setIsQueueOpen(prev => !prev);
          setIsLyricsOpen(false);
        }}
      />

      {/* 4. Sync User Modal */}
      <SyncUserModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onSyncUser={handleSyncUser}
        currentUsername={userProfile?.id || ''}
      />
    </div>
  );
}
