import type { Artist, Album, Track } from "@/types/music";
import type { Caption } from "@/types/content";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PublicProfileProps {
  displayName: string;
  bio: string | null;
  featuredArtists: Artist[];
  artists: Artist[];
  albums: Album[];
  tracks: Track[];
  captions: Caption[];
  isOwner?: boolean;
  viewCount?: number;
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
  featuredArtists,
  artists,
  albums,
  tracks,
  captions,
  isOwner = false,
  viewCount,
}: PublicProfileProps) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Navigation bar - always visible */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
          {/* Back to home button - always visible */}
          <a
            href="/"
            className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            title="Back to Anchor.band"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back</span>
          </a>

          {/* Owner navigation - only visible to owner */}
          {isOwner && (
            <div className="flex gap-4">
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
            {/* View counter badge */}
            {viewCount !== undefined && viewCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>{viewCount.toLocaleString()} views</span>
              </div>
            )}
            </div>
          )}
        </div>
      </div>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* Header section */}
        <header className="mb-12 text-center">
          {/* Musical Anchor Icon + Name */}
          <div className="flex items-center justify-center gap-3 mb-3">
            {/* Musical Anchor Icon - combines music note and anchor */}
            <div className="relative flex-shrink-0">
              <svg
                className="w-10 h-10 sm:w-12 sm:h-12 text-neutral-700 dark:text-neutral-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Anchor symbol */}
                <circle cx="12" cy="5" r="3"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <path d="M5 16a7 7 0 0 0 14 0"/>
                <line x1="5" y1="16" x2="5" y2="18"/>
                <line x1="19" y1="16" x2="19" y2="18"/>
              </svg>
              {/* Small music note overlay */}
              <svg
                className="absolute -top-1 -right-1 w-4 h-4 text-blue-500 dark:text-blue-400"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-neutral-100">
              {displayName}
            </h1>

            {/* Bio tooltip trigger */}
            {bio && (
              <div className="group relative flex-shrink-0">
                <button
                  type="button"
                  className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-400 transition-colors cursor-help"
                  aria-label="Show bio"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                {/* Bio popup - shows on hover */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 p-4">
                    <div className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      {bio}
                    </div>
                    {/* Arrow pointer */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-white dark:border-b-neutral-800"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Subtle tagline */}
          <p className="text-xs text-neutral-500 dark:text-neutral-500 uppercase tracking-wide">
            Musical Anchor
          </p>
        </header>

        {/* Featured Artists section */}
        {featuredArtists.length > 0 && (
          <section className="mb-12">
            <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-500 uppercase tracking-wide mb-4">
              Featured Artists
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:justify-center">
              {featuredArtists.map((artist) => {
                const imgUrl = pickImage(artist.images);
                return (
                  <a
                    key={artist.id}
                    href={spotifyUrl(artist.id, 'artist')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-none flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
                    style={{ minWidth: 96 }}
                  >
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full ring-2 ring-blue-500 overflow-hidden flex items-center justify-center bg-neutral-200 dark:bg-neutral-800">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={artist.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-neutral-500 text-2xl font-medium">
                          {artist.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-neutral-600 dark:text-neutral-400 text-center truncate w-24">
                      {artist.name}
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        )}

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
              {tracks.slice(0, 10).map((track, i) => (
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
