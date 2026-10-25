export interface HomeCardItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  type?: 'playlist' | 'album' | 'track' | 'radio' | 'mix' | 'featured';
  badgeColor?: string;
  badgeNumber?: string;
  topSubtitle?: string;
  hasProgress?: boolean;
  progressPercent?: number;
  artistName?: string;
  spotifyUri?: string;
}

export const QUICK_ACCESS_ITEMS: HomeCardItem[] = [
  {
    id: 'hello-kitter',
    title: 'Hello Kitter',
    subtitle: 'Playlist • Shreeji',
    image: 'https://image-cdn-fa.spotifycdn.com/image/ab67706c0000da84c0835a7462cbc57696426e97',
    type: 'playlist',
    spotifyUri: 'spotify:playlist:5k3iI5fE68jr4UdX2UG6NN'
  },
  {
    id: 'gym',
    title: 'Gym',
    subtitle: 'Playlist • Shreeji',
    image: 'https://image-cdn-ak.spotifycdn.com/image/ab67706c0000d72cc1277cc06401a3f12819c5ab',
    type: 'playlist',
    spotifyUri: 'spotify:playlist:0rPcNgfcMCzc8Z8rStIvBR'
  },
  {
    id: 'peak-kanye',
    title: 'Peak Kanye',
    subtitle: 'Playlist • Rory',
    image: 'https://mosaic.scdn.co/640/ab67616d00001e020cd942c1a864afa4e92d04f2ab67616d00001e021dacfbc31cc873d132958af9ab67616d00001e0226f7f19c7f0381e56156c94aab67616d00001e02d9194aa18fa4c9362b47464f',
    type: 'playlist',
    spotifyUri: 'spotify:playlist:6Fs9lBMpHdqjvQ6wCPDnKc'
  },
  {
    id: 'enter-sandman',
    title: 'Enter Sandman',
    subtitle: 'Playlist • Dick',
    image: 'https://i.scdn.co/image/ab67616d00001e02aeef6d1f525548aabcea0f6e',
    type: 'playlist',
    spotifyUri: 'spotify:playlist:2MPjgtZn4IxxV7lW9RjO3E'
  },
  {
    id: 'masculine-white-girl',
    title: 'Ultimate Masculine White Girl Playlist',
    subtitle: 'Playlist • Shreeji',
    image: 'https://image-cdn-ak.spotifycdn.com/image/ab67706c0000da84548f934f722fc37082b5f75e',
    type: 'playlist',
    spotifyUri: 'spotify:playlist:0eWPQwqiBULXb39IveEIbP'
  },
  {
    id: 'deepwork-v1',
    title: 'DeepWork Volume 1',
    subtitle: 'Album • DeepWork Research',
    image: 'https://image-cdn-fa.spotifycdn.com/image/ab67706c0000da8477279648152295b8d0572854',
    type: 'album',
    spotifyUri: 'spotify:playlist:6qeZgMKQB3S8FbjrNdPDCJ'
  },
  {
    id: 'larp-mix',
    title: 'LARP MIX',
    subtitle: 'Playlist • User',
    image: 'https://image-cdn-fa.spotifycdn.com/image/ab67706c0000da84cb6735803e7638cf97bc14e0',
    type: 'playlist',
    spotifyUri: 'spotify:playlist:5AXBZqcu0HJeWRi6lFNm8Y'
  },
  {
    id: 'white-girl-bangers',
    title: 'White girl bangers 💃💅🏽💈💿🪩',
    subtitle: 'Playlist • Spotify',
    image: 'https://mosaic.scdn.co/640/ab67616d00001e022ffc2c580b6595a3e675a730ab67616d00001e0231548865f7c729290b96c794ab67616d00001e0297c7b770b28ffeed164f4d0eab67616d00001e02d20c38f295039520d688a888',
    type: 'playlist',
    spotifyUri: 'spotify:playlist:2VdPwVMqEGb6dwQVRlC88L'
  }
];

export const MADE_FOR_YOU_ITEMS: HomeCardItem[] = [
  {
    id: 'daily-mix-1',
    title: 'Daily Mix 1',
    subtitle: 'Tyler, The Creator, Kanye West, Drake and more',
    image: '/covers/daily-mix-1.png',
    type: 'mix',
    badgeColor: '#00d4ff',
    badgeNumber: '01'
  },
  {
    id: 'daily-mix-2',
    title: 'Daily Mix 2',
    subtitle: 'Britney Spears, Lady Gaga, Maroon 5 and...',
    image: '/covers/daily-mix-2.png',
    type: 'mix',
    badgeColor: '#ffd152',
    badgeNumber: '02'
  },
  {
    id: 'daily-mix-3',
    title: 'Daily Mix 3',
    subtitle: 'UdieNnx, Purpeel, ptasinski and more',
    image: '/covers/daily-mix-3.png',
    type: 'mix',
    badgeColor: '#ff7700',
    badgeNumber: '03'
  },
  {
    id: 'daily-mix-4',
    title: 'Daily Mix 4',
    subtitle: 'Korn, Slipknot, Limp Bizkit and more',
    image: '/covers/daily-mix-4.png',
    type: 'mix',
    badgeColor: '#e91e63',
    badgeNumber: '04'
  },
  {
    id: 'daily-mix-5',
    title: 'Daily Mix 5',
    subtitle: 'TV Girl, Mac DeMarco, Arctic Monkeys and...',
    image: '/covers/daily-mix-5.png',
    type: 'mix',
    badgeColor: '#a6e22e',
    badgeNumber: '05'
  },
  {
    id: 'daily-mix-6',
    title: 'Daily Mix 6',
    subtitle: 'NovaX, noturgf, LNRT and more',
    image: '/covers/daily-mix-6.png',
    type: 'mix',
    badgeColor: '#5c7cfa',
    badgeNumber: '06'
  },
  {
    id: 'discover-weekly',
    title: 'Discover Weekly',
    subtitle: 'Your shortcut to hidden gems, deep cuts, and...',
    image: '/covers/discover-weekly.png',
    type: 'playlist'
  },
  {
    id: 'release-radar',
    title: 'Release Radar',
    subtitle: 'Catch all the latest music from artists you follow,...',
    image: '/covers/release-radar.png',
    type: 'playlist'
  }
];

export const JUMP_BACK_IN_ITEMS: HomeCardItem[] = [
  {
    id: 'worry-ultra-slowed',
    title: 'worry (ultra slowed)',
    subtitle: 'LONOWN, riserayss',
    image: '/covers/jump-worry-slowed.png',
    type: 'track'
  },
  {
    id: 'kanye-west-radio',
    title: 'Kanye West Radio',
    subtitle: 'With ¥$, Travis Scott, A$AP Rocky and more',
    image: '/covers/jump-kanye-west-radio.png',
    type: 'radio',
    badgeColor: '#ffd152'
  },
  {
    id: 'peak-songssssssss',
    title: 'PEAK SONGSSSSSSSS',
    subtitle: 'Follow me on ig: @museekagency',
    image: '/covers/jump-peak-songssssssss.png',
    type: 'playlist'
  },
  {
    id: 'yzy2missioncontrol',
    title: 'yzy2missioncontrol',
    subtitle: 'shrng',
    image: '/covers/jump-yzy2missioncontrol.png',
    type: 'playlist'
  },
  {
    id: 'no-lyrics-just-thoughts',
    title: 'no lyrics just thoughts',
    subtitle: 'For when you need to sleep,study,think or...',
    image: '/covers/jump-no-lyrics-just-thoughts.png',
    type: 'playlist'
  }
];

export const RECENTS_ITEMS: HomeCardItem[] = [
  {
    id: 'recent-hello-kitter',
    title: 'Hello Kitter',
    subtitle: 'Playlist • Shreeji',
    image: '/covers/recent-hello-kitter.png',
    type: 'playlist'
  },
  {
    id: 'recent-deepwork',
    title: 'DeepWork Volume 1',
    subtitle: 'Album • DeepWork...',
    image: '/covers/recent-deepwork-1.png',
    type: 'album'
  },
  {
    id: 'recent-olivia-dean',
    title: 'love me not olivia dean',
    subtitle: 'Playlist • MXNIKK',
    image: '/covers/recent-love-me-not.png',
    type: 'playlist'
  },
  {
    id: 'recent-gym',
    title: 'Gym',
    subtitle: '2 songs added',
    image: '/covers/recent-gym.png',
    type: 'playlist'
  },
  {
    id: 'recent-enter-sandman',
    title: 'Enter Sandman',
    subtitle: 'Playlist • Dick',
    image: '/covers/recent-enter-sandman.png',
    type: 'playlist'
  },
  {
    id: 'recent-peak-kanye',
    title: 'Peak Kanye',
    subtitle: 'Playlist • Rory',
    image: '/covers/recent-peak-kanye.png',
    type: 'playlist'
  },
  {
    id: 'recent-masculine',
    title: 'Ultimate Masculine...',
    subtitle: 'Playlist • Shreeji',
    image: '/covers/recent-ultimate-masculine.png',
    type: 'playlist'
  },
  {
    id: 'recent-never-see-me',
    title: 'Never See Me Again',
    subtitle: 'Track • Kanye West',
    image: '/covers/recent-never-see-me-again.png',
    type: 'track',
    hasProgress: true,
    progressPercent: 65
  },
  {
    id: 'recent-stadium-pump',
    title: 'STADIUM PUMP UP...',
    subtitle: 'Playlist • j_rosendahl',
    image: '/covers/recent-stadium-pump-up.png',
    type: 'playlist'
  }
];

export const RECOMMENDED_STATIONS: HomeCardItem[] = [
  {
    id: 'station-even-flow',
    title: 'Even Flow',
    subtitle: 'With Pearl Jam, The Smashing Pumpkins,...',
    image: '/covers/station-even-flow.png',
    type: 'radio',
    badgeColor: '#57e389',
    artistName: 'Pearl Jam'
  },
  {
    id: 'station-tame-impala',
    title: 'Tame Impala',
    subtitle: 'With Gorillaz, MGMT, Arctic Monkeys and...',
    image: '/covers/station-tame-impala.png',
    type: 'radio',
    badgeColor: '#a285d2',
    artistName: 'Tame Impala'
  },
  {
    id: 'station-kali-uchis',
    title: 'Kali Uchis',
    subtitle: 'With Tyler, The Creator, Steve Lacy, Clairo and...',
    image: '/covers/station-kali-uchis.png',
    type: 'radio',
    badgeColor: '#b298dc',
    artistName: 'Kali Uchis'
  },
  {
    id: 'station-take-me-out',
    title: 'Take Me Out',
    subtitle: 'With Franz Ferdinand, The Killers, The Strokes...',
    image: '/covers/station-take-me-out.png',
    type: 'radio',
    badgeColor: '#50c878',
    artistName: 'Franz Ferdinand'
  },
  {
    id: 'station-sade',
    title: 'Sade',
    subtitle: 'With berlioz, Chris Isaak, Thee Sacred Souls and...',
    image: '/covers/station-sade.png',
    type: 'radio',
    badgeColor: '#f4976c',
    artistName: 'Sade'
  },
  {
    id: 'station-travis-scott',
    title: 'Travis Scott',
    subtitle: 'With Huncho Jack, Gunna, Lil Baby and...',
    image: '/covers/station-travis-scott.png',
    type: 'radio',
    badgeColor: '#2e8b57',
    artistName: 'Travis Scott'
  },
  {
    id: 'station-katy-perry',
    title: 'Katy Perry',
    subtitle: 'With Rihanna, Maroon 5, Miley Cyrus and more',
    image: '/covers/station-katy-perry.png',
    type: 'radio',
    badgeColor: '#ffd152',
    artistName: 'Katy Perry'
  },
  {
    id: 'station-laufey',
    title: 'Laufey',
    subtitle: 'With Liana Flores, natalie jinju, wave to earth and...',
    image: '/covers/station-laufey.png',
    type: 'radio',
    badgeColor: '#85a5ff',
    artistName: 'Laufey'
  }
];

export const TOP_MIXES: HomeCardItem[] = [
  {
    id: 'mix-indie-rock',
    title: 'Indie Rock Mix',
    subtitle: 'The Neighbourhood, Cafuné, Tame Impala an...',
    image: '/covers/mix-indie-rock.png',
    type: 'mix',
    badgeColor: '#ffd152'
  },
  {
    id: 'mix-2000s',
    title: '2000s Mix',
    subtitle: 'Shakira, Milky, Kanye West and more',
    image: '/covers/mix-2000s.png',
    type: 'mix',
    badgeColor: '#4a69bd'
  },
  {
    id: 'mix-kanye',
    title: 'Kanye West Mix',
    subtitle: 'Drake, Justin Timberlake and Eminem',
    image: '/covers/mix-kanye-west.png',
    type: 'mix',
    badgeColor: '#eb4d4b'
  },
  {
    id: 'mix-rock',
    title: 'Rock Mix',
    subtitle: 'AC/DC, Red Hot Chili Peppers, Soundgarden...',
    image: '/covers/mix-rock.png',
    type: 'mix',
    badgeColor: '#ff4757'
  },
  {
    id: 'mix-happy',
    title: 'Happy Mix',
    subtitle: 'Rihanna, Ravyn Lenae, Clean Bandit and more',
    image: '/covers/mix-happy.png',
    type: 'mix',
    badgeColor: '#ffa502'
  },
  {
    id: 'mix-hip-hop',
    title: 'Hip Hop Mix',
    subtitle: 'Rihanna, JAY-Z, Kanye West and more',
    image: '/covers/mix-hip-hop.png',
    type: 'mix',
    badgeColor: '#2ed573'
  },
  {
    id: 'mix-chill',
    title: 'Chill Mix',
    subtitle: 'Mac DeMarco, Metro Boomin, Franz Ferdinand...',
    image: '/covers/mix-chill.png',
    type: 'mix',
    badgeColor: '#70a1ff'
  },
  {
    id: 'mix-holy-fuck',
    title: 'Holy Fuck Mix',
    subtitle: 'Vessel, Cage The Elephant and Aloboi',
    image: '/covers/mix-holy-fuck.png',
    type: 'mix',
    badgeColor: '#ced6e0'
  },
  {
    id: 'mix-pop',
    title: 'Pop Mix',
    subtitle: 'Vanessa Carlton, Miley Cyrus, Empire Of The S...',
    image: '/covers/mix-pop.png',
    type: 'mix',
    badgeColor: '#a55eea'
  }
];

export const RECOMMENDED_FOR_TODAY: HomeCardItem[] = [
  {
    id: 'rec-demon-days',
    title: 'Demon Days',
    subtitle: 'Gorillaz',
    image: '/covers/rec-demon-days.png',
    type: 'album'
  },
  {
    id: 'rec-notion',
    title: 'Notion',
    subtitle: 'The Rare Occasions',
    image: '/covers/rec-notion.png',
    type: 'track'
  },
  {
    id: 'rec-songs-big-chair',
    title: 'Songs From The Big Chair',
    subtitle: 'Tears For Fears',
    image: '/covers/rec-songs-from-the-big-chair.png',
    type: 'album'
  },
  {
    id: 'rec-dark-red',
    title: 'Dark Red',
    subtitle: 'Steve Lacy',
    image: '/covers/rec-dark-red.png',
    type: 'track'
  },
  {
    id: 'rec-walking-on-dream',
    title: 'Walking On A Dream (10th Anniversary...)',
    subtitle: 'Empire Of The Sun',
    image: '/covers/rec-walking-on-a-dream.png',
    type: 'album'
  },
  {
    id: 'rec-dont-forget-about-me',
    title: "Don't Forget About Me, Demos",
    subtitle: 'Dominic Fike',
    image: '/covers/rec-dont-forget-about-me.png',
    type: 'album'
  },
  {
    id: 'rec-running',
    title: 'Running',
    subtitle: 'Cafuné',
    image: '/covers/rec-running.png',
    type: 'track'
  },
  {
    id: 'rec-night-begin-to-shine',
    title: 'The Night Begin to Shine',
    subtitle: 'B.E.R.',
    image: '/covers/rec-the-night-begin-to-shine.png',
    type: 'track'
  },
  {
    id: 'rec-ardipithecus',
    title: 'ARDIPITHECUS',
    subtitle: 'WILLOW',
    image: '/covers/rec-ardipithecus.png',
    type: 'album'
  }
];

export const FEATURED_RADIO_CARDS: HomeCardItem[] = [
  {
    id: 'featured-metallica-radio',
    title: 'Metallica Radio',
    subtitle: 'With Mötley Crüe, System Of A Down, Slayer and more',
    image: '/covers/large-metallica-banner.png',
    type: 'featured',
    topSubtitle: 'More like Metallica'
  },
  {
    id: 'featured-deftones-radio',
    title: 'Deftones Radio',
    subtitle: 'With Chevelle, Team Sleep, Pantera and more',
    image: '/covers/large-deftones-banner.png',
    type: 'featured',
    topSubtitle: 'Made for you'
  },
  {
    id: 'featured-coldplay-radio',
    title: 'Coldplay Radio',
    subtitle: 'With OneRepublic, Ed Sheeran, Harry Styles and more',
    image: '/covers/large-coldplay-banner.png',
    type: 'featured',
    topSubtitle: 'Made for you'
  },
  {
    id: 'featured-dopamine',
    title: 'DOPAMINE',
    subtitle: 'a serotonin forward glow',
    image: '/covers/large-dopamine-banner.png',
    type: 'featured',
    topSubtitle: 'Based on your recent listening'
  }
];
