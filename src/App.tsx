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
  getSavedImportedPlaylists,
  addImportedPlaylist,
  getSavedLikedTrackIds,
  saveLikedTrackIds,
  SpotifyUserProfile
} from './spotifyApi';

export function App() {
  const [playlists, setPlaylists] = useState<Playlist[]>(() => getSavedImportedPlaylists());
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [searchPlaylists, setSearchPlaylists] = useState<Playlist[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<SpotifyUserProfile | null>(getSavedUserProfile());
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  // Player state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [trackDuration, setTrackDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.75);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(() => getSavedLikedTrackIds());

  // Playlist context currently being listened to (for scoped shuffle & sequential auto-play)
  const [activePlaybackPlaylist, setActivePlaybackPlaylist] = useState<{
    id: string;
    title: string;
    tracks: Track[];
  } | null>(null);

  // Auxiliary panels (Now Playing View, Lyrics, Queue)
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);
  const [rightPanelTab, setRightPanelTab] = useState<'nowPlaying' | 'lyrics' | 'queue'>('nowPlaying');

  const mainScrollRef = useRef<HTMLDivElement>(null);
  
  // Real-time refs to completely eliminate stale closure bugs in AudioEngine & MediaSession
  const activePlaybackPlaylistRef = useRef<{ id: string; title: string; tracks: Track[] } | null>(null);
  const currentTrackRef = useRef<Track | null>(null);
  const isShuffleRef = useRef<boolean>(isShuffle);
  const repeatModeRef = useRef<RepeatMode>(repeatMode);
  const allTracksRef = useRef<Track[]>([]);
  const selectedPlaylistRef = useRef<Playlist | null>(null);
  const progressRef = useRef<number>(0);
  const handleNextRef = useRef<() => void>(() => {});
  const handlePreviousRef = useRef<() => void>(() => {});

  // 1. Audio Engine Callbacks Setup
  useEffect(() => {
    audioEngine.onTimeUpdate((current, duration) => {
      setProgress(current);
      progressRef.current = current;
      if (duration > 0) {
        setTrackDuration(duration);
      }
    });

    audioEngine.onTrackEnded(() => {
      if (repeatModeRef.current === 'one') {
        setProgress(0);
        progressRef.current = 0;
        audioEngine.seek(0);
        audioEngine.resume();
      } else {
        handleNextRef.current();
      }
    });

    audioEngine.setVolume(volume);
  }, []);

  // Sync liked tracks to storage
  useEffect(() => {
    saveLikedTrackIds(likedTrackIds);
  }, [likedTrackIds]);

  // 2. Initial Load: Sync User Playlists & Merge with Persisted Imported Playlists
  useEffect(() => {
    async function initUser() {
      const saved = getSavedUserProfile();
      const targetUser = saved?.id || 'spotify';
      const savedImported = getSavedImportedPlaylists();

      try {
        const result = await fetchUserProfile(targetUser);
        if (result && result.playlists.length > 0) {
          setUserProfile(result.user);
          // Fetch full track list with real album covers for the first playlist
          const firstDetails = await fetchLivePlaylistDetails(result.playlists[0].id);
          const userPlaylists = result.playlists.map((p, idx) =>
            idx === 0 && firstDetails
              ? { ...p, tracks: firstDetails.tracks, coverUrl: firstDetails.coverUrl || p.coverUrl }
              : p
          );

          // Merge imported playlists (persisted across reloads) with user profile playlists
          const importedIds = new Set(savedImported.map(p => p.id));
          const deduplicatedUser = userPlaylists.filter(p => !importedIds.has(p.id));
          const allPlaylists = [...savedImported, ...deduplicatedUser];

          setPlaylists(allPlaylists);
          setSelectedPlaylistId(prev => prev || allPlaylists[0]?.id || null);
          if (firstDetails?.tracks?.length && !currentTrack) {
            setCurrentTrack(firstDetails.tracks[0]);
          }
        } else if (savedImported.length > 0) {
          setPlaylists(savedImported);
          setSelectedPlaylistId(prev => prev || savedImported[0]?.id || null);
        }
      } catch (err) {
        console.warn('Initial sync fallback:', err);
        if (savedImported.length > 0) {
          setPlaylists(savedImported);
          setSelectedPlaylistId(prev => prev || savedImported[0]?.id || null);
        }
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

  // 4. Debounced Live Catalog Search (Tracks + Playlists)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchPlaylists([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const { tracks, playlists: foundPlaylists } = await searchSpotifyCatalog(searchQuery);
      setSearchResults(tracks);
      setSearchPlaylists(foundPlaylists);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle selecting or playing a searched playlist (Persisted across reloads)
  const handleSelectSearchPlaylist = async (playlist: Playlist, autoPlay: boolean = false) => {
    let target = playlists.find(p => p.id === playlist.id);
    if (!target) {
      addImportedPlaylist(playlist);
      setPlaylists(prev => [playlist, ...prev]);
      target = playlist;
    }

    setSelectedPlaylistId(playlist.id);
    setCurrentView('playlist');

    if (!target.tracks || target.tracks.length === 0) {
      const details = await fetchLivePlaylistDetails(playlist.id);
      if (details && details.tracks.length > 0) {
        const fullPlaylist = {
          ...target,
          tracks: details.tracks,
          coverUrl: details.coverUrl || target.coverUrl,
          description: details.description || target.description,
          gradient: details.gradient || target.gradient
        };
        addImportedPlaylist(fullPlaylist);
        setPlaylists(prev =>
          prev.map(p =>
            p.id === playlist.id ? fullPlaylist : p
          )
        );
        if (autoPlay) {
          handlePlayTrack(details.tracks[0]);
        }
      }
    } else if (autoPlay && target.tracks.length > 0) {
      handlePlayTrack(target.tracks[0]);
    }
  };

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

  // Active playback tracks (from the playlist currently being listened to, or fallback)
  const activePlayingTracks = activePlaybackPlaylist?.tracks?.length
    ? activePlaybackPlaylist.tracks
    : (selectedPlaylist?.tracks?.length ? selectedPlaylist.tracks : allTracks);

  // Queue tracks
  const queueTracks = currentTrack ? activePlayingTracks.filter(t => t.id !== currentTrack.id) : activePlayingTracks;

  // Keep refs synchronized with state on every render
  currentTrackRef.current = currentTrack;
  activePlaybackPlaylistRef.current = activePlaybackPlaylist;
  isShuffleRef.current = isShuffle;
  repeatModeRef.current = repeatMode;
  allTracksRef.current = allTracks;
  selectedPlaylistRef.current = selectedPlaylist;
  progressRef.current = progress;

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
      navigator.mediaSession.setActionHandler('previoustrack', () => handlePreviousRef.current());
      navigator.mediaSession.setActionHandler('nexttrack', () => handleNextRef.current());
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
        handleNextRef.current();
      } else if (e.code === 'ArrowLeft' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handlePreviousRef.current();
      } else if (e.code === 'ArrowRight' && currentTrackRef.current) {
        e.preventDefault();
        handleSeek(Math.min(currentTrackRef.current.duration, progressRef.current + 5));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(Math.max(0, progressRef.current - 5));
      } else if (e.key.toLowerCase() === 'm') {
        setVolume(v => (v > 0 ? 0 : 0.75));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const handlePlayTrack = (
    track: Track,
    contextTracks?: Track[],
    playlistInfo?: { id: string; title: string }
  ) => {
    if (contextTracks && contextTracks.length > 0) {
      const info = {
        id: playlistInfo?.id || selectedPlaylistId || 'playlist',
        title: playlistInfo?.title || selectedPlaylist?.title || 'Playlist',
        tracks: contextTracks
      };
      setActivePlaybackPlaylist(info);
      activePlaybackPlaylistRef.current = info;
    } else if (!activePlaybackPlaylistRef.current && selectedPlaylist?.tracks?.length) {
      const info = {
        id: selectedPlaylist.id,
        title: selectedPlaylist.title,
        tracks: selectedPlaylist.tracks
      };
      setActivePlaybackPlaylist(info);
      activePlaybackPlaylistRef.current = info;
    }

    setCurrentTrack(track);
    currentTrackRef.current = track;
    setProgress(0);
    progressRef.current = 0;
    setTrackDuration(track.duration || 180);
    setIsPlaying(true);
    setIsRightPanelOpen(true);
    setRightPanelTab('nowPlaying');
    audioEngine.playTrack(track);
  };

  const handleNext = () => {
    // 1. Determine active list strictly from the playlist currently being listened to
    const currentActive = activePlaybackPlaylistRef.current;
    const currentSelected = selectedPlaylistRef.current;

    let list: Track[] = [];
    let playlistInfo: { id: string; title: string } | undefined = undefined;

    if (currentActive && currentActive.tracks && currentActive.tracks.length > 0) {
      list = currentActive.tracks;
      playlistInfo = { id: currentActive.id, title: currentActive.title };
    } else if (currentSelected && currentSelected.tracks && currentSelected.tracks.length > 0) {
      list = currentSelected.tracks;
      playlistInfo = { id: currentSelected.id, title: currentSelected.title };
    } else if (allTracksRef.current && allTracksRef.current.length > 0) {
      list = allTracksRef.current;
    }

    if (list.length === 0) return;

    const current = currentTrackRef.current;
    const currentIndex = current
      ? list.findIndex(t => t.id === current.id || (
          t.title.trim().toLowerCase() === current.title.trim().toLowerCase() &&
          t.artist.trim().toLowerCase() === current.artist.trim().toLowerCase()
        ))
      : -1;

    let nextTrack: Track;
    if (isShuffleRef.current) {
      if (list.length === 1) {
        nextTrack = list[0];
      } else {
        // Randomly pick a song from the playlist currently listening to (not the current song)
        let randomIndex = Math.floor(Math.random() * list.length);
        if (randomIndex === currentIndex) {
          randomIndex = (randomIndex + 1) % list.length;
        }
        nextTrack = list[randomIndex];
      }
    } else {
      // Repeat off and reached end of playlist
      if (repeatModeRef.current === 'off' && currentIndex >= list.length - 1) {
        setIsPlaying(false);
        audioEngine.pause();
        return;
      }
      // Sequential order of the playlist
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % list.length : 0;
      nextTrack = list[nextIndex];
    }

    handlePlayTrack(nextTrack, list, playlistInfo);
  };

  const handlePrevious = () => {
    if (progressRef.current > 3) {
      setProgress(0);
      progressRef.current = 0;
      audioEngine.seek(0);
      return;
    }

    const currentActive = activePlaybackPlaylistRef.current;
    const currentSelected = selectedPlaylistRef.current;

    let list: Track[] = [];
    let playlistInfo: { id: string; title: string } | undefined = undefined;

    if (currentActive && currentActive.tracks && currentActive.tracks.length > 0) {
      list = currentActive.tracks;
      playlistInfo = { id: currentActive.id, title: currentActive.title };
    } else if (currentSelected && currentSelected.tracks && currentSelected.tracks.length > 0) {
      list = currentSelected.tracks;
      playlistInfo = { id: currentSelected.id, title: currentSelected.title };
    } else if (allTracksRef.current && allTracksRef.current.length > 0) {
      list = allTracksRef.current;
    }

    if (list.length === 0) return;

    const current = currentTrackRef.current;
    const currentIndex = current
      ? list.findIndex(t => t.id === current.id || (
          t.title.trim().toLowerCase() === current.title.trim().toLowerCase() &&
          t.artist.trim().toLowerCase() === current.artist.trim().toLowerCase()
        ))
      : 0;

    let prevTrack: Track;
    if (isShuffleRef.current) {
      if (list.length === 1) {
        prevTrack = list[0];
      } else {
        let randomIndex = Math.floor(Math.random() * list.length);
        if (randomIndex === currentIndex) {
          randomIndex = (randomIndex - 1 + list.length) % list.length;
        }
        prevTrack = list[randomIndex];
      }
    } else {
      const prevIndex = (currentIndex - 1 + list.length) % list.length;
      prevTrack = list[prevIndex];
    }

    handlePlayTrack(prevTrack, list, playlistInfo);
  };

  // Keep callback refs updated on each render
  handleNextRef.current = handleNext;
  handlePreviousRef.current = handlePrevious;

  const handleSeek = (seconds: number) => {
    setProgress(seconds);
    progressRef.current = seconds;
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

  // Import Playlist Handler (Persisted to localStorage across reloads)
  const handleImportPlaylist = async (url: string): Promise<boolean> => {
    const imported = await importSpotifyPlaylist(url);
    if (!imported) return false;

    addImportedPlaylist(imported);
    setPlaylists(prev => {
      const filtered = prev.filter(p => p.id !== imported.id && p.playlistId !== imported.playlistId);
      return [imported, ...filtered];
    });
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
            searchPlaylists={searchPlaylists}
            onSelectSearchPlaylist={handleSelectSearchPlaylist}
            onSelectSearchCategory={(cat: string) => {
              setSearchQuery(cat);
              handleSelectView('search');
            }}
            isSearching={isSearching}
            allTracks={allTracks}
            userProfile={userProfile}
          />
        </main>

        {/* Right Panel (Now Playing View / Lyrics / Queue) */}
        <RightPanel
          currentTrack={currentTrack}
          currentPlaylistTitle={activePlaybackPlaylist?.title || selectedPlaylist?.title || 'Now Playing'}
          isOpen={isRightPanelOpen}
          activeTab={rightPanelTab}
          onClose={() => setIsRightPanelOpen(false)}
          onSelectTab={tab => setRightPanelTab(tab)}
          queue={queueTracks}
          progress={progress}
          onPlayTrack={handlePlayTrack}
          isLiked={currentTrack ? likedTrackIds.has(currentTrack.id) : false}
          onToggleLike={() => {
            if (currentTrack) toggleLikeTrack(currentTrack.id);
          }}
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
        duration={trackDuration}
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
        isNowPlayingViewOpen={isRightPanelOpen && rightPanelTab === 'nowPlaying'}
        onToggleNowPlayingView={() => {
          if (isRightPanelOpen && rightPanelTab === 'nowPlaying') {
            setIsRightPanelOpen(false);
          } else {
            setIsRightPanelOpen(true);
            setRightPanelTab('nowPlaying');
          }
        }}
        isLyricsOpen={isRightPanelOpen && rightPanelTab === 'lyrics'}
        onToggleLyrics={() => {
          if (isRightPanelOpen && rightPanelTab === 'lyrics') {
            setIsRightPanelOpen(false);
          } else {
            setIsRightPanelOpen(true);
            setRightPanelTab('lyrics');
          }
        }}
        isQueueOpen={isRightPanelOpen && rightPanelTab === 'queue'}
        onToggleQueue={() => {
          if (isRightPanelOpen && rightPanelTab === 'queue') {
            setIsRightPanelOpen(false);
          } else {
            setIsRightPanelOpen(true);
            setRightPanelTab('queue');
          }
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
