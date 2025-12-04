import { NextResponse } from "next/server";
import { auth } from "@/app/auth";

export async function GET() {
  // Get the user session (includes accessToken)
  const session = await auth();

  if (!session || !session.accessToken) {
    return NextResponse.json(
      { error: "Not authenticated with Spotify" },
      { status: 401 }
    );
  }

  try {
    // Fetch the user’s playlists from Spotify
    const response = await fetch("https://api.spotify.com/v1/me/playlists", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`);
    }

    const data = await response.json();

    // Map the playlist data into a simpler format
    const playlists = data.items.map((playlist: any) => ({
      id: playlist.id,
      name: playlist.name,
      owner: playlist.owner.display_name,
      tracks: playlist.tracks.total,
      image: playlist.images?.[0]?.url || null,
      spotifyUrl: playlist.external_urls.spotify,
    }));

    return NextResponse.json({ playlists });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch playlists" },
      { status: 500 }
    );
  }
}
