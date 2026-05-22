import paris from "@/assets/album-paris.jpg";
import anniversary from "@/assets/album-anniversary.jpg";
import summer from "@/assets/album-summer.jpg";
import winter from "@/assets/album-winter.jpg";
import beach from "@/assets/album-beach.jpg";
import firstdate from "@/assets/album-firstdate.jpg";
import dance from "@/assets/album-dance.jpg";
import roadtrip from "@/assets/album-roadtrip.jpg";

export type Album = {
  id: string;
  title: string;
  year: string;
  tagline: string;
  description: string;
  cover: string;
  category: string;
  photos: { src: string; caption: string }[];
};

export const albums: Album[] = [
  {
    id: "paris",
    title: "Paris, Mon Amour",
    year: "2024",
    tagline: "A weekend lost in cobblestone streets and golden lights.",
    description: "From midnight strolls along the Seine to croissants at sunrise — the city held us close.",
    cover: paris,
    category: "Travel",
    photos: [
      { src: paris, caption: "Under the tower, the night we lost track of time." },
      { src: dance, caption: "Dancing in a courtyard we found by accident." },
      { src: anniversary, caption: "Wine, candles, and that look you gave me." },
    ],
  },
  {
    id: "anniversary",
    title: "Three Years",
    year: "2024",
    tagline: "Candles, wine, and the way you laugh.",
    description: "Three years of inside jokes, slow mornings, and choosing each other again.",
    cover: anniversary,
    category: "Anniversaries",
    photos: [
      { src: anniversary, caption: "The dinner I almost burned." },
      { src: dance, caption: "Our song, the kitchen floor." },
    ],
  },
  {
    id: "summer",
    title: "Summer Adventures",
    year: "2023",
    tagline: "Trails, rivers, and sunburned shoulders.",
    description: "A summer of muddy boots, alpine sunrises, and sleeping under stars.",
    cover: summer,
    category: "Adventures",
    photos: [
      { src: summer, caption: "The peak, just before the rain." },
      { src: roadtrip, caption: "The drive there." },
      { src: beach, caption: "And the reward at the coast." },
    ],
  },
  {
    id: "winter",
    title: "Cabin in the Snow",
    year: "2023",
    tagline: "Firewood, hot cocoa, and snowflakes on your eyelashes.",
    description: "Two days off-grid, one fireplace, endless quiet.",
    cover: winter,
    category: "Getaways",
    photos: [
      { src: winter, caption: "The cabin glowing through the trees." },
      { src: anniversary, caption: "Cocoa by candlelight." },
    ],
  },
  {
    id: "beach",
    title: "Our First Trip",
    year: "2022",
    tagline: "Salt air, cheap wine, and the beginning of everything.",
    description: "Where it all started — sand in our shoes, your hand in mine.",
    cover: beach,
    category: "Travel",
    photos: [
      { src: beach, caption: "Sunset on the first night." },
      { src: firstdate, caption: "Coffee the morning after." },
    ],
  },
  {
    id: "firstdate",
    title: "First Date",
    year: "2021",
    tagline: "Two coffees, three hours, one beginning.",
    description: "The little café on the corner — where I knew.",
    cover: firstdate,
    category: "Beginnings",
    photos: [{ src: firstdate, caption: "The coffees that started it all." }],
  },
  {
    id: "dance",
    title: "Garden Lights",
    year: "2024",
    tagline: "Slow dancing under string lights.",
    description: "A backyard, a playlist, and you in that dress.",
    cover: dance,
    category: "Moments",
    photos: [{ src: dance, caption: "One more song." }],
  },
  {
    id: "roadtrip",
    title: "Coastal Road Trip",
    year: "2023",
    tagline: "Windows down, the whole coast ours.",
    description: "Five days, seven beaches, a thousand songs.",
    cover: roadtrip,
    category: "Adventures",
    photos: [
      { src: roadtrip, caption: "Cliffs at golden hour." },
      { src: beach, caption: "We stopped here for hours." },
    ],
  },
];

export const getAlbum = (id: string) => albums.find((a) => a.id === id);

export const rows = [
  { title: "Featured Memories", ids: ["paris", "anniversary", "beach", "winter"] },
  { title: "Travel & Adventures", ids: ["paris", "summer", "roadtrip", "beach"] },
  { title: "Quiet Moments", ids: ["dance", "firstdate", "anniversary", "winter"] },
  { title: "From the Beginning", ids: ["firstdate", "beach", "anniversary", "paris"] },
];
