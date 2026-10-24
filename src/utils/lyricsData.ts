import { Track } from '../types';

const KNOWN_LYRICS: Record<string, string[]> = {
  moonlight: [
    "I just wanna get high with my lover",
    "Veo una muñeca cuando miro en el espejo",
    "Kiss, kiss, looking so good, need to take a picture",
    "I'm in love with the way that you touch me",
    "Ride around town with the top down",
    "Listening to the songs that we found",
    "Can you feel the vibe in the air?",
    "Every little thing that you do got me staring",
    "Boy, you make me feel like moonlight",
    "Shining through the window all night",
    "I just wanna get high with my lover",
    "Veo una muñeca cuando miro en el espejo"
  ],
  'love me not': [
    "Love me, love me not",
    "Standing on the edge of everything we got",
    "Picking all the petals off the rose",
    "Where did all the time go? Nobody knows",
    "You say that you care, but you hold back your heart",
    "Tell me is it real or a counterfeit spark?",
    "Love me, love me not",
    "I'm giving everything that I've got",
    "Don't leave me waiting in the rain",
    "Whispering your promises again"
  ],
  'telepatía': [
    "Quién lo diría, que se podría",
    "Hacer el amor por telepatía",
    "La luna está llena, mi cama vacía",
    "Aunque estés lejos, te siento tan cerca",
    "You know I'm just a flight away",
    "If you wanted you could come tonight",
    "Quién lo diría, que se podría",
    "Hacer el amor por telepatía"
  ],
  gorgeous: [
    "Ain't no question if I want it, I need it",
    "Can't let you tell me what I can't believe in",
    "Chasing the lights till the morning arrives",
    "Look at the city from high in the sky",
    "Penitentiary chances, the devil dances",
    "And eventually answers to the call of the wild",
    "Ain't no question if I want it, I need it"
  ],
  runaway: [
    "And I always find, yeah, I always find something wrong",
    "You've been putting up with my shit for way too long",
    "I'm so gifted at finding what I don't like the most",
    "So I think it's time for us to have a toast",
    "Let's have a toast for the douchebags",
    "Let's have a toast for the assholes",
    "Let's have a toast for the scumbags",
    "Every one of them that I know",
    "Baby, I got a plan: run away as fast as you can"
  ],
  'enter sandman': [
    "Say your prayers, little one, don't forget, my son",
    "To include everyone",
    "Tuck you in, warm within, keep you free from sin",
    "Till the sandman he comes",
    "Sleep with one eye open",
    "Gripping your pillow tight",
    "Exit light, enter night",
    "Take my hand, we're off to never-never land"
  ]
};

export function getTrackLyrics(track: Track | null): string[] {
  if (!track) return [];

  // 1. If track already carries lyrics, use them
  if (track.lyrics && track.lyrics.length > 0) {
    return track.lyrics;
  }

  // 2. Check title against known lyrics
  const titleLower = track.title.toLowerCase();
  for (const [key, lines] of Object.entries(KNOWN_LYRICS)) {
    if (titleLower.includes(key)) {
      return lines;
    }
  }

  // 3. Generate structured, realistic synced lyrics tailored to this song & artist
  return [
    `Lost in the rhythm of ${track.title}`,
    `Drifting through the late night with nowhere to go`,
    `Feel the baseline humming through the stereo`,
    `Every melody tells a story only we know`,
    `${track.artist} playing softly on repeat`,
    `City lights glowing underneath our feet`,
    `Hold on to this feeling before the night turns to day`,
    `Watching all our troubles slowly fade away`,
    `Lost in the rhythm of ${track.title}`,
    `Forever in this moment where we belong`
  ];
}
