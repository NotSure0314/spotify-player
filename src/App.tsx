import { useState, useEffect, useRef, useMemo } from 'react';
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
  saveImportedPlaylists,
  addImportedPlaylist,
  removeImportedPlaylist,
  getSavedLikedTrackIds,
  saveLikedTrackIds,
  getSavedPinnedPlaylistIds,
  savePinnedPlaylistIds,
  getSavedRemovedPlaylistIds,
  clearRemovedPlaylistId,
  saveLastAccount,
  SpotifyUserProfile
} from './spotifyApi';
import { getHighResImageUrl } from './utils/imageUtils';

export function App() {
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    const user = getSavedUserProfile();
    return getSavedImportedPlaylists(user?.id);
  });
  const [pinnedPlaylistIds, setPinnedPlaylistIds] = useState<string[]>(() => {
    const user = getSavedUserProfile();
    return getSavedPinnedPlaylistIds(user?.id);
  });
  const [viewedPlaylist, setViewedPlaylist] = useState<Playlist | null>(null);
  const [currentView, setCurrentView] = useState<string>('home');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [searchPlaylists, setSearchPlaylists] = useState<Playlist[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<SpotifyUserProfile | null>(getSavedUserProfile());
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  // Player state
  const [currentTrack, setCurrentTrack] = useState<Track | null>(() => {
    try {
      const saved = localStorage.getItem('spotify_last_played_track');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.track || null;
      }
    } catch {}
    return null;
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [trackDuration, setTrackDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.75);
  const [isShuffle, setIsShuffle] = useState<boolean>(() => {
    try {
      return localStorage.getItem('spotify_player_shuffle') === 'true';
    } catch {
      return false;
    }
  });
  const [shuffledQueue, setShuffledQueue] = useState<Track[]>([]);
  const [playbackHistory, setPlaybackHistory] = useState<Track[]>([]);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const [likedTrackIds, setLikedTrackIds] = useState<Set<string>>(() => {
    const user = getSavedUserProfile();
    return getSavedLikedTrackIds(user?.id);
  });

  // Playlist context currently being listened to (for scoped shuffle & sequential auto-play)
  const [activePlaybackPlaylist, setActivePlaybackPlaylist] = useState<{
    id: string;
    title: string;
    tracks: Track[];
  } | null>(() => {
    try {
      const saved = localStorage.getItem('spotify_last_played_track');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.playlistInfo || null;
      }
    } catch {}
    return null;
  });

  // Auxiliary panels (Now Playing View, Lyrics, Queue)
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 850 : true;
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 900 : false;
  });
  const [rightPanelTab, setRightPanelTab] = useState<'nowPlaying' | 'lyrics' | 'queue'>('nowPlaying');

  // Responsive window resize observer
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 900) {
        setIsSidebarCollapsed(true);
      }
      if (width < 800) {
        setIsRightPanelOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const mainScrollRef = useRef<HTMLDivElement>(null);
  
  // Real-time refs to completely eliminate stale closure bugs in AudioEngine & MediaSession
  const activePlaybackPlaylistRef = useRef<{ id: string; title: string; tracks: Track[] } | null>(null);
  const currentTrackRef = useRef<Track | null>(null);
  const isShuffleRef = useRef<boolean>(isShuffle);
  const shuffledQueueRef = useRef<Track[]>(shuffledQueue);
  const playbackHistoryRef = useRef<Track[]>(playbackHistory);
  const repeatModeRef = useRef<RepeatMode>(repeatMode);
  const allTracksRef = useRef<Track[]>([]);
  const selectedPlaylistRef = useRef<Playlist | null>(null);
  const progressRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const togglePlayRef = useRef<() => void>(() => {});
  const handleSeekRef = useRef<(seconds: number) => void>(() => {});
  const handleNextRef = useRef<() => void>(() => {});
  const handlePreviousRef = useRef<() => void>(() => {});

  // 1. Audio Engine Callbacks Setup
  useEffect(() => {
    audioEngine.onPlaybackStateChange((playing) => {
      setIsPlaying(playing);
      isPlayingRef.current = playing;
    });

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

  // 2. Initial Load: Sync User Playlists & Merge with Persisted Scoped Library
  useEffect(() => {
    async function initUser() {
      const saved = getSavedUserProfile();
      const targetUser = saved?.id || 'spotify';
      const savedImported = getSavedImportedPlaylists(targetUser);
      const removedIds = getSavedRemovedPlaylistIds(targetUser);

      try {
        const result = await fetchUserProfile(targetUser);
        if (result && result.playlists.length > 0) {
          setUserProfile(result.user);
          // Fetch full track list with real album covers for the first playlist
          const firstDetails = await fetchLivePlaylistDetails(result.playlists[0].id);
          const userPlaylists = result.playlists.map((p, idx) =>
            idx === 0 && firstDetails
              ? { ...p, tracks: firstDetails.tracks, coverUrl: getHighResImageUrl(firstDetails.coverUrl || p.coverUrl) }
              : { ...p, coverUrl: getHighResImageUrl(p.coverUrl) }
          );

          // Merge imported/saved playlists (persisted for this user) with user profile playlists
          let allPlaylists: Playlist[];
          if (savedImported && savedImported.length > 0) {
            const savedIds = new Set(
              savedImported.map(p => (p.playlistId || p.id).replace('spotify:playlist:', '').replace('spotify:album:', ''))
            );
            const deduplicatedUser = userPlaylists.filter(p => {
              const cleanId = (p.playlistId || p.id).replace('spotify:playlist:', '').replace('spotify:album:', '');
              return !savedIds.has(cleanId) && !removedIds.has(cleanId);
            });
            allPlaylists = [...savedImported, ...deduplicatedUser];
          } else {
            allPlaylists = userPlaylists.filter(p => {
              const cleanId = (p.playlistId || p.id).replace('spotify:playlist:', '').replace('spotify:album:', '');
              return !removedIds.has(cleanId);
            });
          }

          // If any playlist was previously saved with <= 100 tracks, upgrade it if firstDetails has more
          if (firstDetails && firstDetails.tracks.length > 0) {
            allPlaylists = allPlaylists.map(p => {
              if ((p.id === result.playlists[0].id || p.playlistId === result.playlists[0].playlistId) && firstDetails.tracks.length > p.tracks.length) {
                const upgraded = { ...p, tracks: firstDetails.tracks, coverUrl: getHighResImageUrl(firstDetails.coverUrl || p.coverUrl) };
                addImportedPlaylist(upgraded, result.user.id);
                return upgraded;
              }
              return p;
            });
          }

          // Persist the combined library for this user
          saveImportedPlaylists(allPlaylists, result.user.id);
          setPlaylists(allPlaylists);
          setSelectedPlaylistId(prev => prev || allPlaylists[0]?.id || null);

          // Scoped pinned playlists & liked tracks for this user
          const savedPinned = getSavedPinnedPlaylistIds(result.user.id);
          setPinnedPlaylistIds(savedPinned);
          const savedLiked = getSavedLikedTrackIds(result.user.id);
          setLikedTrackIds(savedLiked);

          if (firstDetails?.tracks?.length && !currentTrackRef.current) {
            setCurrentTrack(firstDetails.tracks[0]);
            currentTrackRef.current = firstDetails.tracks[0];
            const initialPl = allPlaylists[0];
            if (initialPl) {
              const info = {
                id: initialPl.id,
                title: initialPl.title,
                tracks: firstDetails.tracks
              };
              setActivePlaybackPlaylist(info);
              activePlaybackPlaylistRef.current = info;
            }
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
      const prevAccount = userProfile || getSavedUserProfile();
      const result = await fetchUserProfile(username);
      if (!result || result.playlists.length === 0) {
        return false;
      }

      // Record previous user account when switching accounts so "Last Account" can switch back
      if (prevAccount && prevAccount.id !== result.user.id) {
        saveLastAccount({
          id: prevAccount.id,
          name: prevAccount.name || prevAccount.id
        });
      }

      setUserProfile(result.user);

      // Load full tracks and real album covers for the first playlist
      const firstDetails = await fetchLivePlaylistDetails(result.playlists[0].id);
      const fullPlaylists = result.playlists.map((p, idx) =>
        idx === 0 && firstDetails
          ? { ...p, tracks: firstDetails.tracks, coverUrl: getHighResImageUrl(firstDetails.coverUrl || p.coverUrl) }
          : { ...p, coverUrl: getHighResImageUrl(p.coverUrl) }
      );

      // Load existing saved playlists & removed playlist IDs for THIS specific user account
      const savedUserLibrary = getSavedImportedPlaylists(result.user.id);
      const removedIds = getSavedRemovedPlaylistIds(result.user.id);
      let userMergedLibrary: Playlist[];

      if (savedUserLibrary && savedUserLibrary.length > 0) {
        // User already has saved playlists or modifications for this account:
        // PRESERVE ALL SAVED PLAYLISTS (including custom imports and saved additions)
        const savedIds = new Set(
          savedUserLibrary.map(p => (p.playlistId || p.id).replace('spotify:playlist:', '').replace('spotify:album:', ''))
        );
        const deduplicatedProfile = fullPlaylists.filter(p => {
          const cleanId = (p.playlistId || p.id).replace('spotify:playlist:', '').replace('spotify:album:', '');
          return !savedIds.has(cleanId) && !removedIds.has(cleanId);
        });
        userMergedLibrary = [...savedUserLibrary, ...deduplicatedProfile];
      } else {
        // First sync for this user: initialize with their public profile playlists
        userMergedLibrary = fullPlaylists.filter(p => {
          const cleanId = (p.playlistId || p.id).replace('spotify:playlist:', '').replace('spotify:album:', '');
          return !removedIds.has(cleanId);
        });
      }

      // Persist the user's library isolated to their account ID
      saveImportedPlaylists(userMergedLibrary, result.user.id);

      // Clean legacy global key so other accounts never pick up previous accounts
      try {
        localStorage.removeItem('spotify_imported_playlists');
      } catch {}

      // Update liked tracks and pinned playlists for the newly synced user
      const userLiked = getSavedLikedTrackIds(result.user.id);
      setLikedTrackIds(userLiked);
      const userPinned = getSavedPinnedPlaylistIds(result.user.id);
      setPinnedPlaylistIds(userPinned);

      setPlaylists(userMergedLibrary);
      setSelectedPlaylistId(userMergedLibrary[0]?.id || null);
      setViewedPlaylist(null);
      setCurrentView('home');

      if (userMergedLibrary[0]?.tracks?.length) {
        setCurrentTrack(userMergedLibrary[0].tracks[0]);
      } else if (firstDetails?.tracks?.length) {
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

  // Handle selecting or playing a searched playlist
  const handleSelectSearchPlaylist = async (playlist: Playlist, autoPlay: boolean = false) => {
    const isLibraryPl = playlists.some(p => p.id === playlist.id || (p.playlistId && p.playlistId === playlist.playlistId));
    let target = playlists.find(p => p.id === playlist.id || (p.playlistId && p.playlistId === playlist.playlistId)) || playlist;

    setViewedPlaylist(target);
    setSelectedPlaylistId(playlist.id);
    setCurrentView('playlist');

    if (!target.tracks || target.tracks.length === 0 || target.tracks.length < 5000) {
      const details = await fetchLivePlaylistDetails(playlist.id);
      if (details && details.tracks.length > (target.tracks?.length || 0)) {
        const fullPlaylist: Playlist = {
          ...target,
          tracks: details.tracks,
          coverUrl: getHighResImageUrl(details.coverUrl || target.coverUrl),
          description: details.description || target.description,
          gradient: details.gradient || target.gradient
        };
        setViewedPlaylist(fullPlaylist);
        if (isLibraryPl) {
          addImportedPlaylist(fullPlaylist, userProfile?.id);
          setPlaylists(prev =>
            prev.map(p =>
              p.id === playlist.id ? fullPlaylist : p
            )
          );
        }
        if (autoPlay) {
          const startTrack = isShuffleRef.current
            ? details.tracks[Math.floor(Math.random() * details.tracks.length)]
            : details.tracks[0];
          handlePlayTrack(startTrack, details.tracks, { id: fullPlaylist.id, title: fullPlaylist.title });
        }
        return;
      }
    } else if (autoPlay && target.tracks.length > 0) {
      const startTrack = isShuffleRef.current
        ? target.tracks[Math.floor(Math.random() * target.tracks.length)]
        : target.tracks[0];
      handlePlayTrack(startTrack, target.tracks, { id: target.id, title: target.title });
    }
  };

  // Handle playing or opening any playlist or album from Home, Search, or Library
  const handlePlayPlaylistOrAlbum = async (
    item: { id?: string; title?: string; image?: string; spotifyUri?: string; subtitle?: string; type?: string },
    autoPlay: boolean = true
  ) => {
    const targetUri = item.spotifyUri || item.id || '';
    const itemTitle = (item.title || '').toLowerCase().trim();
    let matched = playlists.find(p =>
      (targetUri && (p.id === targetUri || p.playlistId === targetUri.replace('spotify:playlist:', '').replace('spotify:album:', ''))) ||
      (itemTitle && p.title.toLowerCase().trim() === itemTitle)
    );

    if (matched) {
      setViewedPlaylist(matched);
      setSelectedPlaylistId(matched.id);
      setCurrentView('playlist');
      if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;

      if (matched.tracks && matched.tracks.length > 0) {
        if (autoPlay) {
          const startTrack = isShuffleRef.current
            ? matched.tracks[Math.floor(Math.random() * matched.tracks.length)]
            : matched.tracks[0];
          handlePlayTrack(startTrack, matched.tracks, { id: matched.id, title: matched.title });
        }
        // If playlist was previously loaded with <= 100 tracks, re-fetch live to expand past 100!
        if (matched.tracks.length <= 100) {
          fetchLivePlaylistDetails(matched.id).then(details => {
            if (details && details.tracks.length > matched!.tracks.length) {
              const fullPlaylist: Playlist = {
                ...matched!,
                tracks: details.tracks,
                coverUrl: getHighResImageUrl(details.coverUrl || matched!.coverUrl),
                description: details.description || matched!.description || 'Spotify Playlist',
                gradient: details.gradient || matched!.gradient || '#1e3a8a'
              };
              addImportedPlaylist(fullPlaylist, userProfile?.id);
              setPlaylists(prev => prev.map(p => (p.id === matched!.id ? fullPlaylist : p)));
              setViewedPlaylist(fullPlaylist);
            }
          });
        }
        return;
      }

      // If tracks are not loaded yet, fetch them live
      const details = await fetchLivePlaylistDetails(matched.id);
      if (details && details.tracks.length > 0) {
        const fullPlaylist: Playlist = {
          ...matched,
          tracks: details.tracks,
          coverUrl: getHighResImageUrl(details.coverUrl || matched.coverUrl),
          description: details.description || matched.description || 'Spotify Playlist',
          gradient: details.gradient || matched.gradient || '#1e3a8a'
        };
        addImportedPlaylist(fullPlaylist, userProfile?.id);
        setPlaylists(prev => prev.map(p => (p.id === matched!.id ? fullPlaylist : p)));
        setViewedPlaylist(fullPlaylist);
        if (autoPlay) {
          const startTrack = isShuffleRef.current
            ? details.tracks[Math.floor(Math.random() * details.tracks.length)]
            : details.tracks[0];
          handlePlayTrack(startTrack, details.tracks, { id: fullPlaylist.id, title: fullPlaylist.title });
        }
      }
      return;
    }

    // Check if it's already in viewedPlaylist and matches:
    if (viewedPlaylist && (
      (targetUri && (viewedPlaylist.id === targetUri || viewedPlaylist.playlistId === targetUri.replace('spotify:playlist:', '').replace('spotify:album:', ''))) ||
      (itemTitle && viewedPlaylist.title.toLowerCase().trim() === itemTitle)
    )) {
      setSelectedPlaylistId(viewedPlaylist.id);
      setCurrentView('playlist');
      if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
      if (autoPlay && viewedPlaylist.tracks && viewedPlaylist.tracks.length > 0) {
        const startTrack = isShuffleRef.current
          ? viewedPlaylist.tracks[Math.floor(Math.random() * viewedPlaylist.tracks.length)]
          : viewedPlaylist.tracks[0];
        handlePlayTrack(startTrack, viewedPlaylist.tracks, { id: viewedPlaylist.id, title: viewedPlaylist.title });
      }
      return;
    }

    // If not currently in user's loaded library playlists:
    // 1. Try direct fetch by item.spotifyUri if provided
    if (item.spotifyUri) {
      const details = await fetchLivePlaylistDetails(item.spotifyUri);
      if (details && details.tracks.length > 0) {
        setViewedPlaylist(details);
        setSelectedPlaylistId(details.id);
        setCurrentView('playlist');
        if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
        if (autoPlay) {
          const startTrack = isShuffleRef.current
            ? details.tracks[Math.floor(Math.random() * details.tracks.length)]
            : details.tracks[0];
          handlePlayTrack(startTrack, details.tracks, { id: details.id, title: details.title });
        }
        return;
      }
    }

    // 2. Otherwise search catalog for playlist or album title
    if (item.title) {
      const cleanSubtitle = (item.subtitle || '')
        .replace(/(Playlist|Album|Track)\s*•\s*/gi, '')
        .split(',')[0]
        .split('•')[0]
        .trim();
      const searchQuery = cleanSubtitle && !item.title.toLowerCase().includes(cleanSubtitle.toLowerCase())
        ? `${item.title} ${cleanSubtitle}`
        : item.title;

      const searchRes = await searchSpotifyCatalog(searchQuery);
      if (searchRes.playlists && searchRes.playlists.length > 0) {
        const foundPl = searchRes.playlists[0];
        const details = await fetchLivePlaylistDetails(foundPl.id);
        if (details && details.tracks.length > 0) {
          setViewedPlaylist(details);
          setSelectedPlaylistId(details.id);
          setCurrentView('playlist');
          if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
          if (autoPlay) {
            const startTrack = isShuffleRef.current
              ? details.tracks[Math.floor(Math.random() * details.tracks.length)]
              : details.tracks[0];
            handlePlayTrack(startTrack, details.tracks, { id: details.id, title: details.title });
          }
          return;
        }
      }

      // 3. Fallback: If catalog search returned tracks for this album/title
      if (searchRes.tracks && searchRes.tracks.length > 0) {
        const albumPlaylist: Playlist = {
          id: `spotify:playlist:album-${Date.now()}`,
          title: item.title,
          description: item.subtitle || `Songs from ${item.title}`,
          coverUrl: getHighResImageUrl(item.image || searchRes.tracks[0]?.coverUrl),
          gradient: '#1e3a8a',
          tracks: searchRes.tracks
        };
        setViewedPlaylist(albumPlaylist);
        setSelectedPlaylistId(albumPlaylist.id);
        setCurrentView('playlist');
        if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
        if (autoPlay) {
          const startTrack = isShuffleRef.current
            ? searchRes.tracks[Math.floor(Math.random() * searchRes.tracks.length)]
            : searchRes.tracks[0];
          handlePlayTrack(startTrack, searchRes.tracks, { id: albumPlaylist.id, title: albumPlaylist.title });
        }
        return;
      }
    }
  };

  // Library-sorted playlists: pinned playlists first (in pinned order), followed by unpinned playlists
  const librarySortedPlaylists = useMemo(() => {
    const pinnedSet = new Set(
      (pinnedPlaylistIds || []).map(id => id.replace('spotify:playlist:', '').replace('spotify:album:', ''))
    );
    const isItemPinned = (pl: Playlist) => {
      const cleanId = (pl.playlistId || pl.id).replace('spotify:playlist:', '').replace('spotify:album:', '');
      return pinnedSet.has(cleanId) || (pinnedPlaylistIds || []).includes(pl.id);
    };

    const pinnedPlaylists: Playlist[] = [];
    for (const pid of (pinnedPlaylistIds || [])) {
      const cleanPid = pid.replace('spotify:playlist:', '').replace('spotify:album:', '');
      const found = playlists.find(p => {
        const pClean = (p.playlistId || p.id).replace('spotify:playlist:', '').replace('spotify:album:', '');
        return p.id === pid || pClean === cleanPid;
      });
      if (found && !pinnedPlaylists.some(p => p.id === found.id)) {
        pinnedPlaylists.push(found);
      }
    }

    const unpinnedPlaylists = playlists.filter(p => !isItemPinned(p));
    return [...pinnedPlaylists, ...unpinnedPlaylists];
  }, [playlists, pinnedPlaylistIds]);

  // Selected playlist object
  const selectedPlaylist =
    playlists.find(p => p.id === selectedPlaylistId || p.playlistId === selectedPlaylistId) ||
    (viewedPlaylist && (viewedPlaylist.id === selectedPlaylistId || viewedPlaylist.playlistId === selectedPlaylistId) ? viewedPlaylist : null) ||
    viewedPlaylist ||
    librarySortedPlaylists[0] ||
    playlists[0] ||
    null;

  // Check if currently viewed playlist is saved in user's library
  const isCurrentPlaylistSaved = Boolean(
    selectedPlaylist && playlists.some(p => {
      if (p.id === selectedPlaylist.id) return true;
      if (p.playlistId && (p.playlistId === selectedPlaylist.playlistId || p.playlistId === selectedPlaylist.id)) return true;
      if (selectedPlaylist.playlistId && p.id === selectedPlaylist.playlistId) return true;
      const cleanP = (p.playlistId || p.id).replace('spotify:playlist:', '').replace('spotify:album:', '');
      const cleanSel = (selectedPlaylist.playlistId || selectedPlaylist.id).replace('spotify:playlist:', '').replace('spotify:album:', '');
      return cleanP === cleanSel;
    })
  );

  // Toggle saving/unsaving playlist to library
  const handleToggleSavePlaylist = (targetPlaylist?: Playlist | null) => {
    const target = targetPlaylist || selectedPlaylist;
    if (!target) return;

    const targetClean = (target.playlistId || target.id).replace('spotify:playlist:', '').replace('spotify:album:', '');
    const isSaved = playlists.some(p => {
      if (p.id === target.id) return true;
      if (p.playlistId && (p.playlistId === target.playlistId || p.playlistId === target.id)) return true;
      const cleanP = (p.playlistId || p.id).replace('spotify:playlist:', '').replace('spotify:album:', '');
      return cleanP === targetClean;
    });

    if (isSaved) {
      setPlaylists(prev => prev.filter(p => {
        const cleanP = (p.playlistId || p.id).replace('spotify:playlist:', '').replace('spotify:album:', '');
        return p.id !== target.id && cleanP !== targetClean;
      }));
      removeImportedPlaylist(target.id, userProfile?.id);
      if (target.playlistId) {
        removeImportedPlaylist(target.playlistId, userProfile?.id);
      }
    } else {
      addImportedPlaylist(target, userProfile?.id);
      setPlaylists(prev => [target, ...prev.filter(p => p.id !== target.id)]);
    }
  };

  // Check if currently viewed playlist is pinned
  const isCurrentPlaylistPinned = Boolean(
    selectedPlaylist && (
      pinnedPlaylistIds.includes(selectedPlaylist.id) ||
      (selectedPlaylist.playlistId && pinnedPlaylistIds.includes(selectedPlaylist.playlistId)) ||
      pinnedPlaylistIds.some(pid => {
        const cleanPid = pid.replace('spotify:playlist:', '').replace('spotify:album:', '');
        const cleanSel = (selectedPlaylist.playlistId || selectedPlaylist.id).replace('spotify:playlist:', '').replace('spotify:album:', '');
        return cleanPid === cleanSel;
      })
    )
  );

  // Toggle pinning/unpinning playlist to top of library
  const handleTogglePinPlaylist = (targetPlaylist?: Playlist | null) => {
    const target = targetPlaylist || selectedPlaylist;
    if (!target) return;

    const targetClean = (target.playlistId || target.id).replace('spotify:playlist:', '').replace('spotify:album:', '');
    const isPinned = pinnedPlaylistIds.some(pid => {
      const cleanPid = pid.replace('spotify:playlist:', '').replace('spotify:album:', '');
      return pid === target.id || cleanPid === targetClean;
    });

    if (isPinned) {
      setPinnedPlaylistIds(prev => {
        const next = prev.filter(pid => {
          const cleanPid = pid.replace('spotify:playlist:', '').replace('spotify:album:', '');
          return pid !== target.id && cleanPid !== targetClean;
        });
        savePinnedPlaylistIds(next, userProfile?.id);
        return next;
      });
    } else {
      // Pin playlist: if not in library yet, also add to library
      const isSaved = playlists.some(p => {
        const pClean = (p.playlistId || p.id).replace('spotify:playlist:', '').replace('spotify:album:', '');
        return p.id === target.id || pClean === targetClean;
      });
      if (!isSaved) {
        addImportedPlaylist(target, userProfile?.id);
        setPlaylists(prev => [target, ...prev.filter(p => p.id !== target.id)]);
      }

      setPinnedPlaylistIds(prev => {
        const next = [target.id, ...prev.filter(pid => {
          const cleanPid = pid.replace('spotify:playlist:', '').replace('spotify:album:', '');
          return pid !== target.id && cleanPid !== targetClean;
        })];
        savePinnedPlaylistIds(next, userProfile?.id);
        return next;
      });
    }
  };

  // If selecting a playlist without loaded tracks or capped at 100, fetch full tracklist
  useEffect(() => {
    if (selectedPlaylistId) {
      const isLibraryPl = playlists.some(p => p.id === selectedPlaylistId || p.playlistId === selectedPlaylistId);
      const currentPl = isLibraryPl
        ? playlists.find(p => p.id === selectedPlaylistId || p.playlistId === selectedPlaylistId)
        : (viewedPlaylist && (viewedPlaylist.id === selectedPlaylistId || viewedPlaylist.playlistId === selectedPlaylistId) ? viewedPlaylist : null);

      if (!currentPl || currentPl.tracks.length === 0 || currentPl.tracks.length < 5000) {
        fetchLivePlaylistDetails(selectedPlaylistId).then(details => {
          if (details && details.tracks.length > (currentPl?.tracks?.length || 0)) {
            const fullPlaylist: Playlist = {
              ...(currentPl || details),
              tracks: details.tracks,
              coverUrl: getHighResImageUrl(details.coverUrl || currentPl?.coverUrl || ''),
              description: details.description || currentPl?.description || 'Spotify Playlist',
              gradient: details.gradient || currentPl?.gradient || '#1e3a8a'
            };
            if (isLibraryPl) {
              addImportedPlaylist(fullPlaylist, userProfile?.id);
              setPlaylists(prev =>
                prev.map(p => (p.id === selectedPlaylistId || p.playlistId === selectedPlaylistId ? fullPlaylist : p))
              );
            }
            setViewedPlaylist(fullPlaylist);
          }
        });
      }
    }
  }, [selectedPlaylistId]);

  // Dynamic Tab Title matching authentic Spotify Web Player
  useEffect(() => {
    if (currentView === 'playlist' && selectedPlaylist) {
      const isAlbum = selectedPlaylist.description?.toLowerCase().includes('album') ||
                      selectedPlaylist.title.toLowerCase().includes('album') ||
                      selectedPlaylist.id.includes(':album:');
      const author = selectedPlaylist.author || (userProfile?.id && selectedPlaylist.description?.includes(userProfile.id) ? userProfile.name : userProfile?.name) || 'Spotify';
      if (isAlbum) {
        document.title = `${selectedPlaylist.title} - album by ${author} | Spotify`;
      } else {
        document.title = `${selectedPlaylist.title} - playlist by ${author} | Spotify`;
      }
    } else if (currentView === 'liked') {
      const author = userProfile?.name || 'Spotify';
      document.title = `Liked Songs - playlist by ${author} | Spotify`;
    } else if (currentView === 'search') {
      if (searchQuery.trim()) {
        document.title = `Spotify - Search: ${searchQuery.trim()}`;
      } else {
        document.title = 'Spotify - Search';
      }
    } else {
      // Home view
      document.title = 'Spotify - Web Player: Music for everyone';
    }
  }, [currentView, selectedPlaylist, userProfile, searchQuery]);

  // All tracks from user's loaded library
  const allTracks = playlists.flatMap(p => p.tracks);

  // Active playback tracks (from the playlist currently being listened to, or fallback)
  const activePlayingTracks = activePlaybackPlaylist?.tracks?.length
    ? activePlaybackPlaylist.tracks
    : (selectedPlaylist?.tracks?.length ? selectedPlaylist.tracks : allTracks);

  // Helper for Fisher-Yates shuffle
  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Queue tracks:
  // If shuffle is ON, upcoming queue is the randomized shuffledQueue!
  // If shuffle is OFF, upcoming queue is the remaining tracks in sequential order after currentTrack!
  const queueTracks = useMemo(() => {
    if (isShuffle) {
      if (shuffledQueue.length > 0) return shuffledQueue;
      const other = currentTrack
        ? activePlayingTracks.filter(t => t.id !== currentTrack.id)
        : activePlayingTracks;
      return shuffleArray(other);
    }
    if (currentTrack && activePlayingTracks.length > 0) {
      const curIdx = activePlayingTracks.findIndex(t => t.id === currentTrack.id || (
        t.title.trim().toLowerCase() === currentTrack.title.trim().toLowerCase() &&
        t.artist.trim().toLowerCase() === currentTrack.artist.trim().toLowerCase()
      ));
      if (curIdx >= 0) {
        return activePlayingTracks.slice(curIdx + 1);
      }
      return activePlayingTracks.filter(t => t.id !== currentTrack.id);
    }
    return activePlayingTracks;
  }, [isShuffle, shuffledQueue, currentTrack, activePlayingTracks]);

  // Keep refs synchronized with state on every render
  currentTrackRef.current = currentTrack;
  isPlayingRef.current = isPlaying;
  activePlaybackPlaylistRef.current = activePlaybackPlaylist;
  isShuffleRef.current = isShuffle;
  shuffledQueueRef.current = shuffledQueue;
  playbackHistoryRef.current = playbackHistory;
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
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable ||
        target?.getAttribute('role') === 'textbox'
      ) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        togglePlayRef.current();
      } else if (e.code === 'ArrowRight' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleNextRef.current();
      } else if (e.code === 'ArrowLeft' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handlePreviousRef.current();
      } else if (e.code === 'ArrowRight' && currentTrackRef.current) {
        e.preventDefault();
        handleSeekRef.current(Math.min(currentTrackRef.current.duration, progressRef.current + 5));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeekRef.current(Math.max(0, progressRef.current - 5));
      } else if (e.key.toLowerCase() === 'm') {
        setVolume(v => (v > 0 ? 0 : 0.75));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Toggle Shuffle with immediate queue reshuffle and instant shuffle play option
  const handleToggleShuffle = (contextPlaylist?: Playlist) => {
    const nextShuffle = !isShuffleRef.current;
    setIsShuffle(nextShuffle);
    isShuffleRef.current = nextShuffle;
    try {
      localStorage.setItem('spotify_player_shuffle', nextShuffle ? 'true' : 'false');
    } catch {}

    const targetPlaylist = contextPlaylist || selectedPlaylistRef.current || (playlists.length > 0 ? playlists[0] : null);
    const activeTracks = (activePlaybackPlaylistRef.current?.tracks?.length
      ? activePlaybackPlaylistRef.current.tracks
      : targetPlaylist?.tracks) || allTracksRef.current;

    if (nextShuffle) {
      // If nothing is playing yet, start playback in shuffle mode immediately!
      // This applies seamlessly whether clicked from the playlist header OR the bottom player bar!
      if (!isPlayingRef.current && activeTracks && activeTracks.length > 0) {
        const randomStart = activeTracks[Math.floor(Math.random() * activeTracks.length)];
        const playlistInfo = contextPlaylist
          ? { id: contextPlaylist.id, title: contextPlaylist.title }
          : (activePlaybackPlaylistRef.current?.id
              ? { id: activePlaybackPlaylistRef.current.id, title: activePlaybackPlaylistRef.current.title }
              : (targetPlaylist ? { id: targetPlaylist.id, title: targetPlaylist.title } : undefined));
        handlePlayTrack(randomStart, activeTracks, playlistInfo, false);
        return;
      }

      // If already playing, immediately populate / reshuffle upcoming queue from active tracks
      if (activeTracks && activeTracks.length > 0) {
        const current = currentTrackRef.current;
        const remaining = current
          ? activeTracks.filter(t => {
              if (t.id && current.id && t.id === current.id) return false;
              if (
                t.title.trim().toLowerCase() === current.title.trim().toLowerCase() &&
                t.artist.trim().toLowerCase() === current.artist.trim().toLowerCase()
              ) return false;
              return true;
            })
          : activeTracks;
        const randomized = shuffleArray(remaining.length > 0 ? remaining : activeTracks);
        setShuffledQueue(randomized);
        shuffledQueueRef.current = randomized;
      }
    } else {
      setShuffledQueue([]);
      shuffledQueueRef.current = [];
    }
  };

  // Playback Handlers
  const togglePlay = () => {
    if (isPlayingRef.current) {
      audioEngine.pause();
      setIsPlaying(false);
      isPlayingRef.current = false;
    } else {
      if (currentTrackRef.current) {
        // If the audio engine has not loaded this track yet (e.g. after a page reload/refresh),
        // we must call handlePlayTrack to load the audio stream and play it!
        const engineTrack = audioEngine.getCurrentTrack();
        if (!audioEngine.hasLoadedTrack() || !engineTrack || engineTrack.id !== currentTrackRef.current.id) {
          const activeTracks = activePlaybackPlaylistRef.current?.tracks?.length
            ? activePlaybackPlaylistRef.current.tracks
            : (selectedPlaylistRef.current?.tracks?.length
                ? selectedPlaylistRef.current.tracks
                : (playlists.length > 0 && playlists[0].tracks?.length ? playlists[0].tracks : allTracksRef.current));

          const playlistInfo = activePlaybackPlaylistRef.current
            ? { id: activePlaybackPlaylistRef.current.id, title: activePlaybackPlaylistRef.current.title }
            : (selectedPlaylistRef.current
                ? { id: selectedPlaylistRef.current.id, title: selectedPlaylistRef.current.title }
                : (playlists.length > 0 ? { id: playlists[0].id, title: playlists[0].title } : undefined));

          // If starting playback fresh with shuffle ON, pick a random track!
          const trackToPlay = (isShuffleRef.current && activeTracks && activeTracks.length > 0)
            ? activeTracks[Math.floor(Math.random() * activeTracks.length)]
            : currentTrackRef.current;

          handlePlayTrack(trackToPlay, activeTracks, playlistInfo, false);
          return;
        }

        // If resuming with shuffle enabled, make sure queue is populated
        if (isShuffleRef.current && shuffledQueueRef.current.length === 0) {
          const targetPlaylist = selectedPlaylistRef.current;
          const activeTracks = activePlaybackPlaylistRef.current?.tracks?.length
            ? activePlaybackPlaylistRef.current.tracks
            : (targetPlaylist?.tracks?.length ? targetPlaylist.tracks : allTracksRef.current);
          if (activeTracks && activeTracks.length > 0) {
            const current = currentTrackRef.current;
            const remaining = activeTracks.filter(t => {
              if (t.id && current.id && t.id === current.id) return false;
              if (
                t.title.trim().toLowerCase() === current.title.trim().toLowerCase() &&
                t.artist.trim().toLowerCase() === current.artist.trim().toLowerCase()
              ) return false;
              return true;
            });
            const randomized = shuffleArray(remaining.length > 0 ? remaining : activeTracks);
            setShuffledQueue(randomized);
            shuffledQueueRef.current = randomized;
          }
        }
        audioEngine.resume();
        setIsPlaying(true);
        isPlayingRef.current = true;
      } else if (selectedPlaylistRef.current?.tracks?.length) {
        const tracks = selectedPlaylistRef.current.tracks;
        const startTrack = isShuffleRef.current
          ? tracks[Math.floor(Math.random() * tracks.length)]
          : tracks[0];
        handlePlayTrack(
          startTrack,
          tracks,
          { id: selectedPlaylistRef.current.id, title: selectedPlaylistRef.current.title }
        );
      } else if (playlists.length > 0 && playlists[0].tracks?.length) {
        const tracks = playlists[0].tracks;
        const startTrack = isShuffleRef.current
          ? tracks[Math.floor(Math.random() * tracks.length)]
          : tracks[0];
        handlePlayTrack(
          startTrack,
          tracks,
          { id: playlists[0].id, title: playlists[0].title }
        );
      }
    }
  };

  const handlePlayTrack = (
    track: Track,
    contextTracks?: Track[],
    playlistInfo?: { id: string; title: string },
    preserveQueue: boolean = false
  ) => {
    // If clicking the track that is already loaded in audioEngine, resume it directly
    const engineTrack = audioEngine.getCurrentTrack();
    if (
      currentTrackRef.current &&
      (currentTrackRef.current.id === track.id ||
        (currentTrackRef.current.title.trim().toLowerCase() === track.title.trim().toLowerCase() &&
         currentTrackRef.current.artist.trim().toLowerCase() === track.artist.trim().toLowerCase())) &&
      engineTrack &&
      audioEngine.hasLoadedTrack()
    ) {
      setIsPlaying(true);
      isPlayingRef.current = true;
      audioEngine.resume();
      return;
    }

    // Record previously playing track in playbackHistory if different
    if (currentTrackRef.current && currentTrackRef.current.id !== track.id) {
      setPlaybackHistory(prev => [...prev.slice(-50), currentTrackRef.current!]);
      playbackHistoryRef.current = [...playbackHistoryRef.current.slice(-50), currentTrackRef.current];
    }

    let tracksPool = contextTracks;
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
      tracksPool = selectedPlaylist.tracks;
    } else if (activePlaybackPlaylistRef.current?.tracks?.length) {
      tracksPool = activePlaybackPlaylistRef.current.tracks;
    }

    if (!preserveQueue && tracksPool && tracksPool.length > 0) {
      if (isShuffleRef.current) {
        // Pool of remaining tracks from this playlist, excluding the track just started
        const remaining = tracksPool.filter(t => {
          if (t.id && track.id && t.id === track.id) return false;
          if (
            t.title.trim().toLowerCase() === track.title.trim().toLowerCase() &&
            t.artist.trim().toLowerCase() === track.artist.trim().toLowerCase()
          ) return false;
          return true;
        });
        const randomized = shuffleArray(remaining.length > 0 ? remaining : tracksPool);
        setShuffledQueue(randomized);
        shuffledQueueRef.current = randomized;
      } else {
        setShuffledQueue([]);
        shuffledQueueRef.current = [];
      }
    } else if (preserveQueue && isShuffleRef.current) {
      // If advancing through queue, pop played track from head or filter it out
      const isHeadMatch = shuffledQueueRef.current.length > 0 && (
        shuffledQueueRef.current[0].id === track.id ||
        (shuffledQueueRef.current[0].title.trim().toLowerCase() === track.title.trim().toLowerCase() &&
         shuffledQueueRef.current[0].artist.trim().toLowerCase() === track.artist.trim().toLowerCase())
      );
      const nextQueue = isHeadMatch
        ? shuffledQueueRef.current.slice(1)
        : shuffledQueueRef.current.filter(t => {
            if (t.id && track.id && t.id === track.id) return false;
            if (
              t.title.trim().toLowerCase() === track.title.trim().toLowerCase() &&
              t.artist.trim().toLowerCase() === track.artist.trim().toLowerCase()
            ) return false;
            return true;
          });
      setShuffledQueue(nextQueue);
      shuffledQueueRef.current = nextQueue;
    }

    setCurrentTrack(track);
    currentTrackRef.current = track;
    setProgress(0);
    progressRef.current = 0;
    setTrackDuration(track.duration || 180);
    setIsPlaying(true);
    isPlayingRef.current = true;
    audioEngine.playTrack(track);

    try {
      localStorage.setItem('spotify_last_played_track', JSON.stringify({
        track,
        playlistInfo: {
          id: playlistInfo?.id || selectedPlaylistId || 'playlist',
          title: playlistInfo?.title || selectedPlaylist?.title || 'Playlist',
          tracks: (contextTracks && contextTracks.length > 0) ? contextTracks.slice(0, 500) : []
        }
      }));
    } catch {}
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

    if (isShuffleRef.current) {
      // 1. If we have upcoming tracks in shuffledQueue, play the next one
      if (shuffledQueueRef.current.length > 0) {
        const nextTrack = shuffledQueueRef.current[0];
        handlePlayTrack(nextTrack, list, playlistInfo, true);
        return;
      }

      // 2. If shuffledQueue is empty, determine if repeat applies or generate new cycle
      const current = currentTrackRef.current;
      const otherTracks = current
        ? list.filter(t => t.id !== current.id)
        : list;
      const pool = otherTracks.length > 0 ? otherTracks : list;

      // Repeat off and finished all tracks in the playlist
      if (repeatModeRef.current === 'off' && playbackHistoryRef.current.length >= list.length - 1) {
        setIsPlaying(false);
        isPlayingRef.current = false;
        audioEngine.pause();
        return;
      }

      // Otherwise re-shuffle playlist tracks and play next track
      const newShuffled = shuffleArray(pool);
      if (newShuffled.length > 0) {
        const nextTrack = newShuffled[0];
        const nextQueue = newShuffled.slice(1);
        setShuffledQueue(nextQueue);
        shuffledQueueRef.current = nextQueue;
        handlePlayTrack(nextTrack, list, playlistInfo, true);
        return;
      }
      return;
    }

    // Sequential mode (Shuffle is OFF)
    const current = currentTrackRef.current;
    const currentIndex = current
      ? list.findIndex(t => t.id === current.id || (
          t.title.trim().toLowerCase() === current.title.trim().toLowerCase() &&
          t.artist.trim().toLowerCase() === current.artist.trim().toLowerCase()
        ))
      : -1;

    // Repeat off and reached end of playlist
    if (repeatModeRef.current === 'off' && currentIndex >= list.length - 1) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      audioEngine.pause();
      return;
    }

    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % list.length : 0;
    const nextTrack = list[nextIndex];
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

    if (isShuffleRef.current) {
      // If we have history of previously played tracks, go back to the previous one
      if (playbackHistoryRef.current.length > 0) {
        const prevTrack = playbackHistoryRef.current[playbackHistoryRef.current.length - 1];
        setPlaybackHistory(prev => prev.slice(0, -1));
        playbackHistoryRef.current = playbackHistoryRef.current.slice(0, -1);

        // Put currently playing track back at the front of shuffledQueue
        if (currentTrackRef.current) {
          const updatedQueue = [currentTrackRef.current, ...shuffledQueueRef.current.filter(t => t.id !== currentTrackRef.current!.id)];
          setShuffledQueue(updatedQueue);
          shuffledQueueRef.current = updatedQueue;
        }

        handlePlayTrack(prevTrack, list, playlistInfo, true);
        return;
      }
      // If no history, restart current track
      setProgress(0);
      progressRef.current = 0;
      audioEngine.seek(0);
      return;
    }

    const current = currentTrackRef.current;
    const currentIndex = current
      ? list.findIndex(t => t.id === current.id || (
          t.title.trim().toLowerCase() === current.title.trim().toLowerCase() &&
          t.artist.trim().toLowerCase() === current.artist.trim().toLowerCase()
        ))
      : 0;

    const prevIndex = (currentIndex - 1 + list.length) % list.length;
    const prevTrack = list[prevIndex];
    handlePlayTrack(prevTrack, list, playlistInfo);
  };

  // Keep callback refs updated on each render
  handleNextRef.current = handleNext;
  handlePreviousRef.current = handlePrevious;
  togglePlayRef.current = togglePlay;

  const handleSeek = (seconds: number) => {
    setProgress(seconds);
    progressRef.current = seconds;
    audioEngine.seek(seconds);
  };
  handleSeekRef.current = handleSeek;

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
      saveLikedTrackIds(next, userProfile?.id);
      return next;
    });
  };

  // Import Playlist Handler (Persisted to localStorage across reloads)
  const handleImportPlaylist = async (url: string): Promise<boolean> => {
    const imported = await importSpotifyPlaylist(url);
    if (!imported) return false;

    addImportedPlaylist(imported, userProfile?.id);
    clearRemovedPlaylistId(imported.id, userProfile?.id);
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
      const match = playlists.find(p => p.id === playlistId || p.playlistId === playlistId);
      if (match) {
        setViewedPlaylist(match);
      }
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
          playlists={librarySortedPlaylists}
          selectedPlaylistId={selectedPlaylistId}
          likedCount={likedTrackIds.size}
          onImportPlaylist={handleImportPlaylist}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
          onPlayPlaylist={pl => handlePlayPlaylistOrAlbum(pl, true)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
          pinnedPlaylistIds={pinnedPlaylistIds}
          onTogglePinPlaylist={handleTogglePinPlaylist}
          userProfile={userProfile}
        />

        {/* Center Main Viewport */}
        <main
          ref={mainScrollRef}
          className="main-viewport"
          style={{
            flex: 1,
            height: '100%',
            backgroundColor: 'var(--background-base)',
            borderRadius: 'var(--panel-radius)',
            overflowY: 'auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0
          }}
        >
          <MainContent
            currentView={currentView}
            selectedPlaylist={selectedPlaylist}
            onSelectPlaylist={(id, autoPlay) => {
              if (autoPlay) {
                handlePlayPlaylistOrAlbum({ id }, true);
              } else {
                handleSelectView('playlist', id);
              }
            }}
            onPlayPlaylistOrAlbum={handlePlayPlaylistOrAlbum}
            playlists={librarySortedPlaylists}
            pinnedPlaylistIds={pinnedPlaylistIds}
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
            isPlaylistSaved={isCurrentPlaylistSaved}
            onToggleSavePlaylist={handleToggleSavePlaylist}
            isShuffle={isShuffle}
            onToggleShuffle={handleToggleShuffle}
            isPlaylistPinned={isCurrentPlaylistPinned}
            onTogglePinPlaylist={handleTogglePinPlaylist}
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
        onToggleShuffle={handleToggleShuffle}
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
