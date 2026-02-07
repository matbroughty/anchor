import type { Artist, Album, Track } from "@/types/music";

/**
 * Mock landing page example profile
 */
export interface LandingExample {
  id: string;
  label: string;
  handle: string;
  displayName: string;
  bio: string;
  topArtists: Artist[];
  topAlbums: Array<Album & { caption: string }>;
  topTracks: Track[];
  imagePath: string;
}

/**
 * Three curated example profiles demonstrating era diversity
 * for the landing page showcase.
 */
export const LANDING_EXAMPLES: LandingExample[] = [
  {
    id: "classic",
    label: "Classic Rock",
    handle: "classicfan",
    displayName: "Alex",
    bio: "Grew up with vinyl and never looked back. There's something about the warmth of analog that digital just can't capture. Always searching for the perfect guitar solo.",
    topArtists: [
      {
        id: "led-zeppelin",
        name: "Led Zeppelin",
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=Led+Zeppelin",
            width: 300,
            height: 300,
          },
        ],
        genres: ["classic rock", "hard rock", "blues rock"],
      },
      {
        id: "pink-floyd",
        name: "Pink Floyd",
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=Pink+Floyd",
            width: 300,
            height: 300,
          },
        ],
        genres: ["progressive rock", "psychedelic rock"],
      },
      {
        id: "the-beatles",
        name: "The Beatles",
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=The+Beatles",
            width: 300,
            height: 300,
          },
        ],
        genres: ["rock", "pop", "psychedelic rock"],
      },
      {
        id: "david-bowie",
        name: "David Bowie",
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=David+Bowie",
            width: 300,
            height: 300,
          },
        ],
        genres: ["art rock", "glam rock"],
      },
      {
        id: "the-doors",
        name: "The Doors",
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=The+Doors",
            width: 300,
            height: 300,
          },
        ],
        genres: ["psychedelic rock", "blues rock"],
      },
      {
        id: "jimi-hendrix",
        name: "Jimi Hendrix",
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=Jimi+Hendrix",
            width: 300,
            height: 300,
          },
        ],
        genres: ["psychedelic rock", "hard rock", "blues rock"],
      },
    ],
    topAlbums: [
      {
        id: "dark-side-moon",
        name: "The Dark Side of the Moon",
        artists: [{ id: "pink-floyd", name: "Pink Floyd" }],
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=Dark+Side",
            width: 300,
            height: 300,
          },
        ],
        albumType: "album",
        caption:
          "The album that convinced me music could be more than entertainment. Every listen reveals something new.",
      },
      {
        id: "led-zeppelin-iv",
        name: "Led Zeppelin IV",
        artists: [{ id: "led-zeppelin", name: "Led Zeppelin" }],
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=Zeppelin+IV",
            width: 300,
            height: 300,
          },
        ],
        albumType: "album",
        caption: "Stairway to Heaven speaks for itself, but the deep cuts here are just as essential.",
      },
      {
        id: "abbey-road",
        name: "Abbey Road",
        artists: [{ id: "the-beatles", name: "The Beatles" }],
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=Abbey+Road",
            width: 300,
            height: 300,
          },
        ],
        albumType: "album",
        caption: "The medley on side two is perfection. This is what happens when four geniuses collaborate.",
      },
      {
        id: "the-rise-fall-ziggy",
        name: "The Rise and Fall of Ziggy Stardust",
        artists: [{ id: "david-bowie", name: "David Bowie" }],
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=Ziggy",
            width: 300,
            height: 300,
          },
        ],
        albumType: "album",
        caption: "Bowie created an entire universe here. The storytelling and theatricality changed everything.",
      },
      {
        id: "la-woman",
        name: "L.A. Woman",
        artists: [{ id: "the-doors", name: "The Doors" }],
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=LA+Woman",
            width: 300,
            height: 300,
          },
        ],
        albumType: "album",
        caption: "Morrison at his most raw and blues-inspired. The final chapter was the best.",
      },
    ],
    topTracks: [
      {
        id: "comfortably-numb",
        name: "Comfortably Numb",
        artists: [{ id: "pink-floyd", name: "Pink Floyd" }],
        album: {
          id: "the-wall",
          name: "The Wall",
          images: [
            {
              url: "https://via.placeholder.com/300x300?text=The+Wall",
              width: 300,
              height: 300,
            },
          ],
          album_type: "album",
        },
        popularity: 85,
      },
      {
        id: "stairway-heaven",
        name: "Stairway to Heaven",
        artists: [{ id: "led-zeppelin", name: "Led Zeppelin" }],
        album: {
          id: "led-zeppelin-iv",
          name: "Led Zeppelin IV",
          images: [
            {
              url: "https://via.placeholder.com/300x300?text=Zeppelin+IV",
              width: 300,
              height: 300,
            },
          ],
          album_type: "album",
        },
        popularity: 90,
      },
      {
        id: "come-together",
        name: "Come Together",
        artists: [{ id: "the-beatles", name: "The Beatles" }],
        album: {
          id: "abbey-road",
          name: "Abbey Road",
          images: [
            {
              url: "https://via.placeholder.com/300x300?text=Abbey+Road",
              width: 300,
              height: 300,
            },
          ],
          album_type: "album",
        },
        popularity: 88,
      },
    ],
    imagePath: "/examples/classic-profile.png",
  },
  {
    id: "modern",
    label: "Modern Pop",
    handle: "tunes",
    displayName: "Jordan",
    bio: "Music that feels like right now. I'm drawn to artists who blur genre lines and aren't afraid to experiment. Production quality matters.",
    topArtists: [
      {
        id: "frank-ocean",
        name: "Frank Ocean",
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=Frank+Ocean",
            width: 300,
            height: 300,
          },
        ],
        genres: ["r&b", "neo soul", "alternative r&b"],
      },
      {
        id: "sza",
        name: "SZA",
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=SZA",
            width: 300,
            height: 300,
          },
        ],
        genres: ["r&b", "neo soul"],
      },
      {
        id: "tyler-creator",
        name: "Tyler, The Creator",
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=Tyler",
            width: 300,
            height: 300,
          },
        ],
        genres: ["hip hop", "alternative hip hop"],
      },
      {
        id: "fkj",
        name: "FKJ",
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=FKJ",
            width: 300,
            height: 300,
          },
        ],
        genres: ["electronic", "nu jazz"],
      },
      {
        id: "daniel-caesar",
        name: "Daniel Caesar",
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=Daniel+Caesar",
            width: 300,
            height: 300,
          },
        ],
        genres: ["r&b", "soul"],
      },
      {
        id: "blood-orange",
        name: "Blood Orange",
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=Blood+Orange",
            width: 300,
            height: 300,
          },
        ],
        genres: ["r&b", "indie pop", "electronic"],
      },
    ],
    topAlbums: [
      {
        id: "blonde",
        name: "Blonde",
        artists: [{ id: "frank-ocean", name: "Frank Ocean" }],
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=Blonde",
            width: 300,
            height: 300,
          },
        ],
        albumType: "album",
        caption: "This album rewired my brain. The vulnerability and production choices are fearless.",
      },
      {
        id: "ctrl",
        name: "CTRL",
        artists: [{ id: "sza", name: "SZA" }],
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=CTRL",
            width: 300,
            height: 300,
          },
        ],
        albumType: "album",
        caption:
          "SZA captures modern relationships with brutal honesty. Every song hits differently depending on your mood.",
      },
      {
        id: "igor",
        name: "IGOR",
        artists: [{ id: "tyler-creator", name: "Tyler, The Creator" }],
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=IGOR",
            width: 300,
            height: 300,
          },
        ],
        albumType: "album",
        caption:
          "Tyler's most cohesive work. It's a complete narrative disguised as a summer soundtrack.",
      },
      {
        id: "french-kiwi-juice",
        name: "French Kiwi Juice",
        artists: [{ id: "fkj", name: "FKJ" }],
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=FKJ",
            width: 300,
            height: 300,
          },
        ],
        albumType: "album",
        caption: "Late night music at its finest. The live looping makes every performance unique.",
      },
      {
        id: "freudian",
        name: "Freudian",
        artists: [{ id: "daniel-caesar", name: "Daniel Caesar" }],
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=Freudian",
            width: 300,
            height: 300,
          },
        ],
        albumType: "album",
        caption: "Modern soul that sounds timeless. Caesar's voice has this effortless quality.",
      },
    ],
    topTracks: [
      {
        id: "self-control",
        name: "Self Control",
        artists: [{ id: "frank-ocean", name: "Frank Ocean" }],
        album: {
          id: "blonde",
          name: "Blonde",
          images: [
            {
              url: "https://via.placeholder.com/300x300?text=Blonde",
              width: 300,
              height: 300,
            },
          ],
          album_type: "album",
        },
        popularity: 82,
      },
      {
        id: "the-weekend",
        name: "The Weekend",
        artists: [{ id: "sza", name: "SZA" }],
        album: {
          id: "ctrl",
          name: "CTRL",
          images: [
            {
              url: "https://via.placeholder.com/300x300?text=CTRL",
              width: 300,
              height: 300,
            },
          ],
          album_type: "album",
        },
        popularity: 80,
      },
      {
        id: "earfquake",
        name: "EARFQUAKE",
        artists: [{ id: "tyler-creator", name: "Tyler, The Creator" }],
        album: {
          id: "igor",
          name: "IGOR",
          images: [
            {
              url: "https://via.placeholder.com/300x300?text=IGOR",
              width: 300,
              height: 300,
            },
          ],
          album_type: "album",
        },
        popularity: 85,
      },
    ],
    imagePath: "/examples/modern-profile.png",
  },
  {
    id: "underground",
    label: "Underground/Emerging",
    handle: "deepcuts",
    displayName: "Sam",
    bio: "Always a few years early to artists before they blow up. I dig through Bandcamp, follow small labels, and trust my gut more than algorithms. Genre is just a suggestion.",
    topArtists: [
      {
        id: "khruangbin",
        name: "Khruangbin",
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=Khruangbin",
            width: 300,
            height: 300,
          },
        ],
        genres: ["psychedelic rock", "funk", "surf rock"],
      },
      {
        id: "black-country-new-road",
        name: "Black Country, New Road",
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=BCNR",
            width: 300,
            height: 300,
          },
        ],
        genres: ["post-rock", "experimental rock"],
      },
      {
        id: "mdou-moctar",
        name: "Mdou Moctar",
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=Mdou+Moctar",
            width: 300,
            height: 300,
          },
        ],
        genres: ["tuareg rock", "psychedelic rock"],
      },
      {
        id: "jai-paul",
        name: "Jai Paul",
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=Jai+Paul",
            width: 300,
            height: 300,
          },
        ],
        genres: ["alternative r&b", "electronic"],
      },
      {
        id: "adrianne-lenker",
        name: "Adrianne Lenker",
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=Lenker",
            width: 300,
            height: 300,
          },
        ],
        genres: ["folk", "indie folk"],
      },
      {
        id: "yves-tumor",
        name: "Yves Tumor",
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=Yves+Tumor",
            width: 300,
            height: 300,
          },
        ],
        genres: ["experimental rock", "art pop"],
      },
    ],
    topAlbums: [
      {
        id: "con-todo-el-mundo",
        name: "Con Todo El Mundo",
        artists: [{ id: "khruangbin", name: "Khruangbin" }],
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=Con+Todo",
            width: 300,
            height: 300,
          },
        ],
        albumType: "album",
        caption:
          "Grooves that transcend language. This trio creates space in music like no one else.",
      },
      {
        id: "ants-from-up-there",
        name: "Ants From Up There",
        artists: [{ id: "black-country-new-road", name: "Black Country, New Road" }],
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=Ants",
            width: 300,
            height: 300,
          },
        ],
        albumType: "album",
        caption: "Orchestral chaos that somehow makes perfect sense. This generation's art rock masterpiece.",
      },
      {
        id: "afrique-victime",
        name: "Afrique Victime",
        artists: [{ id: "mdou-moctar", name: "Mdou Moctar" }],
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=Afrique",
            width: 300,
            height: 300,
          },
        ],
        albumType: "album",
        caption: "Desert blues meets shredding guitar work. Music that reminds you the world is vast.",
      },
      {
        id: "leak-04-13",
        name: "Leak 04-13 (Bait Ones)",
        artists: [{ id: "jai-paul", name: "Jai Paul" }],
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=Jai+Paul",
            width: 300,
            height: 300,
          },
        ],
        albumType: "compilation",
        caption: "Unfinished demos that sound more complete than most finished albums. Pure innovation.",
      },
      {
        id: "songs-and-instrumentals",
        name: "songs and instrumentals",
        artists: [{ id: "adrianne-lenker", name: "Adrianne Lenker" }],
        images: [
          {
            url: "https://via.placeholder.com/300x300?text=Lenker",
            width: 300,
            height: 300,
          },
        ],
        albumType: "album",
        caption: "Recorded in a cabin in the woods and you can hear it. Intimacy at its most disarming.",
      },
    ],
    topTracks: [
      {
        id: "maria-tambien",
        name: "Maria Tambien",
        artists: [{ id: "khruangbin", name: "Khruangbin" }],
        album: {
          id: "con-todo-el-mundo",
          name: "Con Todo El Mundo",
          images: [
            {
              url: "https://via.placeholder.com/300x300?text=Con+Todo",
              width: 300,
              height: 300,
            },
          ],
          album_type: "album",
        },
        popularity: 72,
      },
      {
        id: "chaos-space-marine",
        name: "Chaos Space Marine",
        artists: [{ id: "black-country-new-road", name: "Black Country, New Road" }],
        album: {
          id: "ants-from-up-there",
          name: "Ants From Up There",
          images: [
            {
              url: "https://via.placeholder.com/300x300?text=Ants",
              width: 300,
              height: 300,
            },
          ],
          album_type: "album",
        },
        popularity: 68,
      },
      {
        id: "chismiten",
        name: "Chismiten",
        artists: [{ id: "mdou-moctar", name: "Mdou Moctar" }],
        album: {
          id: "afrique-victime",
          name: "Afrique Victime",
          images: [
            {
              url: "https://via.placeholder.com/300x300?text=Afrique",
              width: 300,
              height: 300,
            },
          ],
          album_type: "album",
        },
        popularity: 65,
      },
    ],
    imagePath: "/examples/underground-profile.png",
  },
];
