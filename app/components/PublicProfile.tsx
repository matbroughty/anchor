import type { Artist, Album, Track } from "@/types/music";
import type { Caption } from "@/types/content";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PublicProfileProps {
  displayName: string;
  bio: string | null;
  artists: Artist[];
  albums: Album[];
  tracks: Track[];
  captions: Caption[];
  isOwner?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Picks the image closest to 300px width from a Spotify image array.
 * Falls back to the first available image, then null.
 */
function pickImage(images: { url: string; width: number }[]): string | null {
  if (!images || images.length === 0) return null;
  const sorted = [...images].sort(
    (a, b) => Math.abs(a.width - 300) - Math.abs(b.width - 300)
  );
  return sorted[0].url;
}

/**
 * Constructs a Spotify URL from an ID and type.
 */
function spotifyUrl(id: string, type: 'artist' | 'album' | 'track'): string {
  return `https://open.spotify.com/${type}/${id}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Public profile layout component.
 * Server component that renders the user's public music taste page.
 *
 * Design philosophy: Calm, minimal, album-first aesthetic.
 */
export function PublicProfile({
  displayName,
  bio,
  artists,
  albums,
  tracks,
  captions,
  isOwner = false,
}: PublicProfileProps) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Owner navigation bar */}
      {isOwner && (
        <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex justify-end gap-4">
            <a
              href="/profile"
              className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              title="Profile Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Profile</span>
            </a>
            <a
              href="/dashboard"
              className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              title="Dashboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
              </svg>
              <span>Dashboard</span>
            </a>
          </div>
        </div>
      )}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Header section */}
        <header className="mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-3">
            {displayName}
          </h1>
          {bio && (
            <p className="text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto leading-relaxed">
              {bio}
            </p>
          )}
        </header>

        {/* Top Artists section */}
        {artists.length > 0 && (
          <section className="mb-12">
            <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-500 uppercase tracking-wide mb-4">
              Top Artists
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              {artists.slice(0, 6).map((artist) => {
                const imgUrl = pickImage(artist.images);
                return (
                  <a
                    key={artist.id}
                    href={spotifyUrl(artist.id, 'artist')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-none flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
                    style={{ minWidth: 80 }}
                  >
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={artist.name}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
                        <span className="text-neutral-500 text-xl font-medium">
                          {artist.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="text-xs text-neutral-600 dark:text-neutral-400 text-center truncate w-20">
                      {artist.name}
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {/* Albums section (MOST PROMINENT - album-first) */}
        {albums.length > 0 && (
          <section className="mb-12">
            <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-500 uppercase tracking-wide mb-4">
              Albums
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {albums.map((album) => {
                const imgUrl = pickImage(album.images);
                const caption = captions.find((c) => c.albumId === album.id);
                return (
                  <div key={album.id} className="group">
                    {/* Album artwork - clickable */}
                    <a
                      href={spotifyUrl(album.id, 'album')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square w-full mb-3 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-800 hover:opacity-80 transition-opacity"
                    >
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={album.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-neutral-400 text-4xl font-medium">
                            {album.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </a>
                    {/* Album info - clickable */}
                    <a
                      href={spotifyUrl(album.id, 'album')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block hover:underline"
                    >
                      <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {album.name}
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-500 truncate mb-2">
                        {album.artists.map((a) => a.name).join(", ")}
                      </p>
                    </a>
                    {/* Caption */}
                    {caption && (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {caption.text}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Top Tracks section */}
        {tracks.length > 0 && (
          <section className="mb-12">
            <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-500 uppercase tracking-wide mb-4">
              Top Tracks
            </h2>
            <ol className="space-y-3">
              {tracks.slice(0, 3).map((track, i) => (
                <li key={track.id} className="flex items-center gap-3">
                  <span className="text-neutral-400 dark:text-neutral-600 text-sm w-5 text-right flex-shrink-0">
                    {i + 1}.
                  </span>
                  <a
                    href={spotifyUrl(track.id, 'track')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 hover:underline"
                  >
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {track.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-500 truncate">
                      {track.artists.map((a) => a.name).join(", ")}
                    </p>
                  </a>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Footer */}
        <footer className="pt-8 border-t border-neutral-200 dark:border-neutral-800 text-center">
          <p className="text-xs text-neutral-400 dark:text-neutral-600">
            Made with{" "}
            <a
              href="https://anchor.band"
              className="hover:text-neutral-600 dark:hover:text-neutral-400 transition-colors"
            >
              Anchor.band
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
