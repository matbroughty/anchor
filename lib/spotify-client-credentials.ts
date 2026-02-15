/**
 * Spotify Client Credentials OAuth flow
 *
 * Provides anonymous access to Spotify catalog API without requiring user authentication.
 * Used for enhancing Last.fm artist images with high-quality Spotify images.
 */

interface ClientCredentialsToken {
  token: string;
  expiresAt: number;
}

let cachedToken: ClientCredentialsToken | null = null;

/**
 * Gets a Spotify access token using the Client Credentials flow.
 *
 * This flow provides app-level access to the Spotify catalog API without
 * requiring user OAuth. Tokens are cached in memory and reused until expiry.
 *
 * @returns Spotify access token valid for ~1 hour
 * @throws Error if authentication fails or credentials are missing
 */
export async function getClientCredentialsToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  // Validate environment variables
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set");
  }

  // Request new token from Spotify
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Spotify client credentials auth failed: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();

  // Cache token with expiry (subtract 60s buffer for safety)
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.token;
}
