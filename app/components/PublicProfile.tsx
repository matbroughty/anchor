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
}: PublicProfileProps) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
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
                  <div
                    key={artist.id}
                    className="flex-none flex flex-col items-center gap-2"
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
                  </div>
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
                    {/* Album artwork */}
                    <div className="aspect-square w-full mb-3 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-800">
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
                    </div>
                    {/* Album info */}
                    <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {album.name}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-500 truncate mb-2">
                      {album.artists.map((a) => a.name).join(", ")}
                    </p>
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
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {track.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-500 truncate">
                      {track.artists.map((a) => a.name).join(", ")}
                    </p>
                  </div>
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
