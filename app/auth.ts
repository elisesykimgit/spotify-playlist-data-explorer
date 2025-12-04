import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

export const authOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: { params: { scope: "playlist-read-private playlist-read-collaborative user-library-read" } },
    }),
  ],
  
  // Callbacks for JWT and Session
  callbacks: {
    async jwt({ token, account }: { token: JWT; account?: any }) {
      // Store the Spotify access token in JWT
      if (account) token.accessToken = account.access_token;
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      // Pass the access token into the session
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
};

// Reusable function to get a client credentials Spotify token
export async function getSpotifyToken(): Promise<string | null> {
  try {
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
          ).toString("base64"),
      },
      body: "grant_type=client_credentials",
    });

    if (!res.ok) {
      console.error("Failed to obtain Spotify token:", res.status);
      return null;
    }

    const data = await res.json();
    return data.access_token;
  } catch (err) {
    console.error("Error fetching Spotify token:", err);
    return null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
