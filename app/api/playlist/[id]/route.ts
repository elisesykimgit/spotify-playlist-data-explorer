import { NextRequest, NextResponse } from "next/server"; 
import { getSpotifyToken } from "@/app/auth";

// Warn if Genius token missing (we’ll still fall back to Google for lyrics)
if (process.env.NODE_ENV !== "production") {
  console.warn("⚠️ Missing GENIUS_ACCESS_TOKEN. Will use Google fallback when needed.");
}

// Configurable concurrency limit (default 5)
const CONCURRENCY_LIMIT =
  Number(process.env.PLAYLIST_FETCH_CONCURRENCY) || 5;

// Track-level cache: caches full per-track results
const trackCache: Record<string, TrackOut> = {};

// ---------- Types ----------
type TrackOut = {
  track: string;
  artists: string[]; 
  artistJoined: string;
  artistIds: string[];
  album: string;
  albumId: string | null; 
  year: string;
  genre: string; 
  lyricsUrl: string | null;
  lyricsSource: "genius" | "google";
  image: string | null;
  albumImage: string | null;
  artistImage: string | null; 
  artistImages: Record<string, string | null>;
};

type SpotifyArtist = { id: string; name: string };

type SpotifyTrackItem = {
  track: {
    name: string;
    album?: {
      name: string;
      release_date?: string;
      images?: { url: string }[];
    };
    artists?: SpotifyArtist[];
  } | null;
};

type SpotifyPlaylist = {
  name?: string;
  images?: { url: string }[];
  description?: string;
  tracks?: { items: SpotifyTrackItem[] };
  items?: SpotifyTrackItem[];
};

// ---------- Helper Functions ----------

// Pagination function to fetch tracks in chunks of 100
async function fetchSpotifyTracks(
  playlistId: string,
  accessToken: string,
  maxTracks: number
): Promise<SpotifyTrackItem[]> {
  const limit = 100;
  const tracks: SpotifyTrackItem[] = [];
  let offset = 0;
  let fetchedTracks = 0;

  while (fetchedTracks < maxTracks) {
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch playlist tracks: ${response.status}`);
    }

    const data = await response.json();
    const items = data.items || [];

    tracks.push(...items);
    fetchedTracks += items.length;

    if (!data.next) break;
    if (fetchedTracks >= maxTracks) break;
    offset += limit;
  }

  return tracks;
}

// ---------- Text normalization helpers ----------
const QUALIFIER_RE =
  /(live|remaster|remastered|edit|version|demo|acoustic|mono|stereo|deluxe|bonus|reissue|mix|session|take|instrumental)/i;

function baseNormalize(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[“”„"]/g, "'")
    .replace(/[’]/g, "'")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function stripQualifierParens(title: string): string {
  return title.replace(/\(([^)]+)\)/g, (_m, inner) =>
    QUALIFIER_RE.test(inner) ? "" : `(${inner})`
  );
}

function stripTrailingQualifiers(title: string): string {
  const parts = title.split(" - ");
  if (parts.length <= 1) return title;
  const left = parts[0];
  const right = parts.slice(1).join(" - ");
  if (QUALIFIER_RE.test(right) || /\b(19|20)\d{2}\b/.test(right)) return left;
  return title;
}

function makeTitleCandidates(original: string): string[] {
  const keep = stripTrailingQualifiers(stripQualifierParens(original)).trim();
  const dropAll = keep.replace(/\([^)]*\)/g, "").trim();
  return [keep, dropAll].filter(Boolean);
}

function tokens(s: string): Set<string> {
  return new Set(baseNormalize(s).split(" ").filter(Boolean));
}

// Jaccard similarity scoring 
function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter || 1;
  return inter / union;
}

function artistMatches(a: string, b: string): boolean {
  const A = baseNormalize(a);
  const B = baseNormalize(b);
  return A === B || A.includes(B) || B.includes(A);
}

function scoreGenius(g: any, trackTitle: string, artistJoined: string): number {
  const gTitle = g?.title || "";
  const gArtist = g?.primary_artist?.name || "";
  const cands = makeTitleCandidates(trackTitle);
  const gTitleTokens = tokens(gTitle);
  const titleScore = Math.max(...cands.map(c => jaccard(tokens(c), gTitleTokens)), 0); // Max Jaccard score across candidates
  const artistScore = artistMatches(artistJoined, gArtist) ? 1 : 0;
  return artistScore * 0.7 + titleScore * 0.3;
}

// ---------- Lyrics fetching ----------
async function fetchLyrics(trackName: string, artistName: string, album: string) {
    let lyricsUrl: string | null = null;
    let lyricsSource: "genius" | "google" = "google";
  
    if (process.env.GENIUS_ACCESS_TOKEN) {
      try {
        const candidates = makeTitleCandidates(trackName);
        const query = `${candidates[0]} ${artistName}`.trim();
  
        const res = await fetch(
          `https://api.genius.com/search?q=${encodeURIComponent(query)}`,
          { headers: { Authorization: `Bearer ${process.env.GENIUS_ACCESS_TOKEN}` } }
        );
  
        const data = await res.json();
        const hits: any[] = Array.isArray(data?.response?.hits)
          ? data.response.hits
          : [];
  
        let best = { score: 0, url: null as string | null };
  
        for (const h of hits) {
          const score = scoreGenius(h.result, trackName, artistName);
          if (score > best.score) best = { score, url: h.result?.url || null };
        }
  
        if (best.url && best.score > 0.85) {
          lyricsUrl = best.url;
          lyricsSource = "genius";
        }
      } catch (e) {
        console.error("Lyrics fetch error:", trackName, e);
      }
    }
  
  if (!lyricsUrl) {
    const q = encodeURIComponent(`${trackName} ${artistName} ${album || ""} lyrics`);
    lyricsUrl = `https://www.google.com/search?q=${q}+site:genius.com+OR+site:azlyrics.com+OR+site:musixmatch.com+OR+site:lyrics.com+OR+site:colorcodedlyrics.com+OR+site:fandom.com`;
    lyricsSource = "google";
  }

  return { lyricsUrl, lyricsSource };
}

// ---------- Artist info (Spotify + Last.fm fallback) ----------
const artistCache: Record<string, { image: string | null; genres: string[] }> = {};

const BAD_LASTFM_TAGS = new Set([
  // Subjective tags
  "best", "top", "legendary", "amazing", "epic", "masterpiece", "underrated", 
  "overrated", "greatest", "iconic", "incredible",
  
  // Non-music-related tags (context-based)
  "chill", "study", "relaxing", "background", "party", "workout", "sleep", 
  "driving", "focus", "gym", "night",
  
  // Unclear descriptive tags (emotion or mood-based)
  "sad", "happy", "angry", "emotional", "uplifting", "nostalgic", "chill", 
  "angsty", "peaceful", "energetic", "intense",
  
  // Regional tags (location-based)
  "local", "hometown", "city", "underground", "DIY", "usa", "uk", 
  
  // Other unhelpful tags
  "seen live", "spotify", "violon", "favorite", "favorites", "favourite", "favourites", "my top song", "my top songs", "better than selena gomez", 
  "my favorite", "my favourites", "love", "loved", "good", "nice", "awesome", 
  "under 2000 listeners", "under 1000 listeners", "female vocalists", "male vocalists", 
  "00s", "90s", "80s", "70s", "60s", "10s", "all", "other"
]);

// ---------- Genre normalization ----------
const GENRE_CANONICAL_MAP: Record<string, string> = {
  // Asian pop
  "kpop": "k-pop",
  "k pop": "k-pop",
  "korean pop": "k-pop",
  "k rap": "k-rap", 

  "jpop": "j-pop",
  "j pop": "j-pop",
  "japanese pop": "j-pop", 

  "cpop": "c-pop",
  "c pop": "c-pop",
  "chinese pop": "c-pop",

  "vpop": "vietnamese pop",
  "v pop": "vietnamese pop",
  "v-pop": "vietnamese pop", 

  // Hip-hop
  "hiphop": "hip hop",
  "hip-hop": "hip hop",
  
  // R&B
  "rnb": "r&b",
  "r&b": "r&b",
  "r n b": "r&b",
  "r'n'b": "r&b",
  "alternative rnb": "alternative r&b", 
  "k-rnb": "k-r&b",

   // Electronic 
  "electronic dance music": "edm",

  "drum n bass": "drum and bass",
  "drum & bass": "drum and bass",
  "dnb": "drum and bass",

  // Indie / Alternative 
  "indie-pop": "indie pop",

  "alt rock": "alternative rock",
  "alt-rock": "alternative rock",

  // Latin genres
  "reggaetón": "reggaeton",

  // Metal / Rock
  "nu-metal": "nu metal",
  "nu metal": "nu metal",

  "pop-punk": "pop punk",

  // others 
  "lofi": "lo-fi", 
  "lo fi": "lo-fi",
};

function normalizeGenre(g: string): string {
  let x = g.trim().toLowerCase();

  // Canonical replacements (kpop, jpop, rnb, indie-pop, etc.) 
  if (GENRE_CANONICAL_MAP[x]) {
    return GENRE_CANONICAL_MAP[x];
  }

  return x;
}

async function fetchLastFmGenres(artistName: string): Promise<string[]> {
  if (!process.env.LASTFM_API_KEY) return [];

  try {
    const url = `http://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist=${encodeURIComponent(
      artistName
    )}&api_key=${process.env.LASTFM_API_KEY}&format=json`;

    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    const tags = data?.toptags?.tag || [];

    if (!Array.isArray(tags)) return [];

    const cleaned = tags
      .filter((t: any) => t?.count && Number(t.count) > 30)
      .map((t: any) => t.name?.toLowerCase().trim())
      .filter(Boolean)
      .filter(tag => !BAD_LASTFM_TAGS.has(tag))
      .slice(0, 3);

    return cleaned.map(normalizeGenre);
  } catch (err) {
    console.error("Last.fm fetch error for", artistName, err);
    return [];
  }
}

// GLOBAL PER-ARTIST SEMAPHORE 
let artistSemaphore = 0;
const MAX_ARTIST_PARALLEL = 4; // safe + low, does NOT affect track batching

async function waitArtistSlot() {
  while (artistSemaphore >= MAX_ARTIST_PARALLEL) {
    await new Promise(r => setTimeout(r, 25));
  }
  artistSemaphore++;
}

function releaseArtistSlot() {
  artistSemaphore = Math.max(artistSemaphore - 1, 0);
}

// ---------- GET ARTIST ----------
async function getArtistInfo(artist: SpotifyArtist | undefined, token: string) {
  // Frontend handles empty string fine — avoids "null" pollution
  const EMPTY = null;

  if (!artist?.id) {
    return { artistImage: EMPTY, genre: "Unknown" };
  }

  // Use cached record ONLY if image is real OR we confirmed artist has no image
  const cached = artistCache[artist.id];
  if (cached) {
    return {
      artistImage: cached.image ?? EMPTY,
      genre: cached.genres.length ? cached.genres.join(", ") : "Unknown",
    };
  }

  let realImage: string | null = null;
  let spotifyGenres: string[] = [];

  // SPOTIFY FETCH WITH SEMAPHORE + RETRIES 
  await waitArtistSlot();
  try {
    const backoffs = [0, 200, 400, 700];

    for (const backoff of backoffs) {
      if (backoff > 0) {
        await new Promise(r => setTimeout(r, backoff + Math.random() * 100));
      }

      const res = await fetch(`https://api.spotify.com/v1/artists/${artist.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();

        // Parse image safely regardless of shape
        realImage =
          data.images?.[0]?.url ??
          (Array.isArray(data.images) && data.images.length === 0 ? null : null);

        spotifyGenres = Array.isArray(data.genres)
          ? data.genres.map((g: string) => g.toLowerCase().trim()).slice(0, 3)
          : [];

        break;
      }

      // Retry if transient (respect Retry-After for 429)
      if ([429, 500, 502, 503, 504].includes(res.status)) {
        let wait = 300; // default fallback 300ms
      
        if (res.status === 429) {
          const retryAfter = res.headers.get("Retry-After");
          if (retryAfter) {
            wait = Math.min(Number(retryAfter) * 1000, 5000);
          }
        }

  console.warn(`[Retry] Spotify artist error ${res.status} for`, artist.name, `waiting ${wait}ms`);
  await new Promise(r => setTimeout(r, wait));
  continue;
}


      // Hard fail — do NOT cache null
      console.warn(`[Skip] Spotify returned ${res.status} for`, artist.name);
      return { artistImage: EMPTY, genre: "Unknown" };
    }
  } catch (err) {
    console.error("Spotify artist fetch failed for", artist.name, err);
    return { artistImage: EMPTY, genre: "Unknown" };
  } finally {
    releaseArtistSlot();
  }

  // LAST.FM GENRES (fallback) 
  let finalGenres = spotifyGenres;
  if (finalGenres.length === 0) {
    const lastfm = await fetchLastFmGenres(artist.name);
    if (lastfm.length > 0) finalGenres = lastfm;
  }

  // CACHE  
  artistCache[artist.id] = { image: realImage, genres: finalGenres };
  
  return {
    artistImage: realImage ?? null,
    genre: finalGenres.length ? finalGenres.join(", ") : "Unknown",
  };
}
// ---------- GET HANDLER ----------
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playlistId } = await context.params;

    const { searchParams } = new URL(request.url);
    const maxTracks = Math.min(
      Math.max(Number(searchParams.get("limit")) || 750, 1),
      1000
    );

    const access_token = await getSpotifyToken();
    if (!access_token) {
      return NextResponse.json(
        { error: "Failed to obtain Spotify token" },
        { status: 500 }
      );
    }

    const playlistRes = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (!playlistRes.ok) {
      if (playlistRes.status === 401 || playlistRes.status === 403) {
        return NextResponse.json(
          {
            error:
              "Playlist is private or from an official Spotify account. Make sure it's a public user-created playlist.",
          },
          { status: playlistRes.status }
        );
      }
      return NextResponse.json(
        { error: `Spotify API error: ${playlistRes.status}` },
        { status: 500 }
      );
    }

    const playlistData: SpotifyPlaylist = await playlistRes.json();
    const playlistName = playlistData.name || "Unknown Playlist";
    const playlistImage =
      playlistData.images?.[0]?.url ||
      "https://placehold.co/600x600?text=No+Cover";

    const items = await fetchSpotifyTracks(playlistId, access_token, maxTracks);

    if (!items?.length) {
      return NextResponse.json(
        { error: "No tracks found in the playlist" },
        { status: 400 }
      );
    }

    const trackPromises = items.map(async (item) => {
      if (!item.track) return null;
      
      const t = item.track;
    
      // Create a stable track cache key
      const cacheKey = `${t.name}__${(t.artists || []).map(a => a.name).join(",")}`;
    
      // Serve entire track from cache if exists
      if (trackCache[cacheKey]) {
        return trackCache[cacheKey];
      }
    
      const album = t.album?.name || "Unknown";
      const albumId = (t.album as any)?.id ?? null;   
      const year = t.album?.release_date?.slice(0, 4) || "Unknown";
      const albumImage =
        t.album?.images?.[0]?.url && t.album.images[0].url.trim() !== ""
          ? t.album.images[0].url
          : null;
    
      const artists = t.artists || [];
      const artistJoined = artists.map(a => a.name).join(", ") || "Unknown";
    
      // Multi-artist info
      const allArtistInfoPromise = (async () => {
        const artistImages: Record<string, string | null> = {};
        const genresCollected = new Set<string>();
    
        let mainArtistImage: string | null = 
          "https://placehold.co/200x200?text=No+Artist+Image";
    
        for (let i = 0; i < artists.length; i++) {
          const a = artists[i];
          const info = await getArtistInfo(a, access_token);
    
          artistImages[a.id] = info.artistImage;
    
          info.genre
            .split(",")
            .map(g => g.trim())
            .filter(Boolean)
            .forEach(g => genresCollected.add(g));
    
          if (i === 0) mainArtistImage = info.artistImage ?? mainArtistImage;
        }
    
        return {
          artistImages,
          allGenres: Array.from(genresCollected).join(", "),
          mainArtistImage,
        };
      })();
    
      const lyricsPromise = fetchLyrics(t.name, artistJoined, album);
    
      const [
        { artistImages, allGenres, mainArtistImage },
        { lyricsUrl, lyricsSource },
      ] = await Promise.all([allArtistInfoPromise, lyricsPromise]);
    
      const out: TrackOut = {
        track: t.name,
        artists: artists.map(a => a.name),
        artistJoined,
        artistIds: artists.map(a => a.id),
        album,
        albumId,  
        year,
        genre: allGenres,
        lyricsUrl,
        lyricsSource,
        image: albumImage,
        albumImage,
        artistImage: mainArtistImage,
        artistImages,
      };
    
      // Store into track-level cache
      trackCache[cacheKey] = out;
    
      return out;
    });

    // batching
    const results: (TrackOut | null)[] = [];
    for (let i = 0; i < trackPromises.length; i += CONCURRENCY_LIMIT) {
      const batch = trackPromises.slice(i, i + CONCURRENCY_LIMIT);
      const resolved = await Promise.allSettled(batch);
      for (const r of resolved)
        if (r.status === "fulfilled" && r.value) results.push(r.value);
    }

    return NextResponse.json({
      name: playlistName,
      image: playlistImage,
      description: playlistData.description || "",
      tracks: results,
    });
  } catch (err) {
    console.error("Unexpected error fetching playlist:", err);
    return NextResponse.json(
      {
        error:
          "Unexpected error fetching playlist. Please try again later.",
      },
      { status: 500 }
    );
  }
}
