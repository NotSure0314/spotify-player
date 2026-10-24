export interface ArtistProfile {
  name: string;
  monthlyListeners: string;
  bio: string;
  image: string;
  videos: { title: string; image: string }[];
  credits: { name: string; role: string; hasLink?: boolean }[];
  tour: { month: string; day: string; city: string; event: string; venue: string }[];
  merch: { name: string; image: string }[];
}

export function getArtistProfile(artistName: string, trackTitle: string, coverUrl: string): ArtistProfile {
  const normalized = (artistName || '').toLowerCase();

  if (normalized.includes('kali uchis')) {
    return {
      name: 'Kali Uchis',
      monthlyListeners: '33,802,937 monthly listeners',
      bio: 'Raised between Virginia and Colombia, Kali Uchis is a Grammy, Billboard Latin Music, Billboard Music, American Music, Premios Nuestra Tierra and Univision award winner.',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
      videos: [
        {
          title: 'Dead To Me - Acoustic',
          image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80'
        },
        {
          title: 'NO HAY LEY',
          image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80'
        }
      ],
      credits: [
        { name: 'Kali Uchis', role: 'Main Artist • Vocalist' },
        { name: 'Magnus Høiberg', role: 'Composer • Lyricist • Programmer • Keyboard', hasLink: true },
        { name: 'Karly-Marina Loaiza', role: 'Composer • Lyricist' }
      ],
      tour: [
        {
          month: 'Nov',
          day: '29',
          city: 'México',
          event: 'Individual General Coca Flow Fest 2026',
          venue: 'Sun 2:00 PM • Autódromo Hermanos Rodríguez'
        },
        {
          month: 'Dec',
          day: '2',
          city: 'Zapopan',
          event: 'Kali Uchis',
          venue: 'Wed 9:00 PM • Auditorio Telmex'
        }
      ],
      merch: [
        {
          name: 'Red Moon In Venus Salmon Vinyl',
          image: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=300&q=80'
        },
        {
          name: 'Moonlight Translucent Ruby 7"',
          image: 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=300&q=80'
        }
      ]
    };
  }

  if (normalized.includes('kanye') || normalized.includes('ye')) {
    return {
      name: 'Kanye West',
      monthlyListeners: '74,512,189 monthly listeners',
      bio: 'Record producer, rapper, and fashion designer. One of the critically acclaimed and influential hip-hop artists of the 21st century.',
      image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
      videos: [
        {
          title: 'Runaway (Full-length Film)',
          image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80'
        },
        {
          title: 'Flashing Lights',
          image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80'
        }
      ],
      credits: [
        { name: 'Kanye West', role: 'Main Artist • Producer • Vocalist' },
        { name: 'Mike Dean', role: 'Producer • Audio Engineer • Synthesizers', hasLink: true },
        { name: 'Anthony Kilhoffer', role: 'Recording Engineer' }
      ],
      tour: [
        {
          month: 'Jul',
          day: '18',
          city: 'Los Angeles',
          event: 'Vultures World Experience',
          venue: 'Sat 8:00 PM • SoFi Stadium'
        },
        {
          month: 'Aug',
          day: '04',
          city: 'Chicago',
          event: 'Donda Stadium Event',
          venue: 'Fri 9:00 PM • Soldier Field'
        }
      ],
      merch: [
        {
          name: 'Graduation Deluxe 2LP Vinyl',
          image: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=300&q=80'
        },
        {
          name: 'The College Dropout 20th Anniversary Edition',
          image: 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=300&q=80'
        }
      ]
    };
  }

  if (normalized.includes('travis scott')) {
    return {
      name: 'Travis Scott',
      monthlyListeners: '65,920,410 monthly listeners',
      bio: 'Grammy-nominated multi-platinum artist, producer, and cultural icon from Houston, Texas. Founder of Cactus Jack Records.',
      image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
      videos: [
        {
          title: 'SICKO MODE (Official Video)',
          image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80'
        },
        {
          title: 'FE!N (Live from Circus Maximus)',
          image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80'
        }
      ],
      credits: [
        { name: 'Travis Scott', role: 'Main Artist • Vocalist' },
        { name: 'Jacques Webster', role: 'Composer • Lyricist' },
        { name: 'OZ', role: 'Producer', hasLink: true }
      ],
      tour: [
        {
          month: 'Sep',
          day: '14',
          city: 'Dallas',
          event: 'Circus Maximus Tour Stadium Run',
          venue: 'Sat 7:30 PM • AT&T Stadium'
        },
        {
          month: 'Oct',
          day: '09',
          city: 'London',
          event: 'Circus Maximus Europe',
          venue: 'Wed 8:00 PM • Tottenham Hotspur Stadium'
        }
      ],
      merch: [
        {
          name: 'UTOPIA Vinyl Pack B',
          image: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=300&q=80'
        },
        {
          name: 'Circus Maximus World Tour Tee',
          image: 'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=300&q=80'
        }
      ]
    };
  }

  // Generic procedural generator for any artist loaded from Spotify
  let hash = 0;
  for (let i = 0; i < artistName.length; i++) {
    hash = (hash << 5) - hash + artistName.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);
  const listenersMillions = (positiveHash % 45) + 12;
  const listenersThousands = (positiveHash % 899) + 100;
  const listenersHundreds = ((positiveHash * 7) % 899) + 100;

  return {
    name: artistName || 'Featured Artist',
    monthlyListeners: `${listenersMillions},${listenersThousands},${listenersHundreds} monthly listeners`,
    bio: `${artistName} is an acclaimed recording artist known for innovative songwriting and captivating worldwide performances.`,
    image: coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    videos: [
      {
        title: `${trackTitle} (Official Music Video)`,
        image: coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80'
      },
      {
        title: `${trackTitle} (Live Acoustic Session)`,
        image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80'
      }
    ],
    credits: [
      { name: artistName, role: 'Main Artist • Vocalist' },
      { name: `${artistName} & Team`, role: 'Composer • Lyricist • Producer', hasLink: true },
      { name: 'Sound Master Labs', role: 'Mixing & Mastering Engineer' }
    ],
    tour: [
      {
        month: 'Nov',
        day: '15',
        city: 'New York',
        event: `${artistName} Live in Concert`,
        venue: 'Sat 8:00 PM • Madison Square Garden'
      },
      {
        month: 'Dec',
        day: '08',
        city: 'Chicago',
        event: `${artistName} Winter Tour 2026`,
        venue: 'Fri 7:30 PM • United Center'
      }
    ],
    merch: [
      {
        name: `${trackTitle} Limited Edition Vinyl`,
        image: coverUrl || 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=300&q=80'
      },
      {
        name: `${artistName} Official World Tour Tee`,
        image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=300&q=80'
      }
    ]
  };
}
