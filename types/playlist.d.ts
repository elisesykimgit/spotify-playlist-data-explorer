// types/playlist.d.ts
export type Track = {
  track: string;
  
  artists: string[];             
  artistJoined: string;  
  artistIds: string[];

  album: string;
  albumId: string | null;
  
  year: string;
  genre: string;
  
  lyricsUrl?: string | null;
  lyricsSource?: "genius" | "google";
  
  image?: string;        // track image (from Spotify)
  albumImage?: string;  // album image (for Top Albums)

  artistImage?: string;
  artistImages?: Record<string, string | null>; // artist image (from Spotify)
};
