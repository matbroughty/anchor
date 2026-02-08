import { ScanCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb";
import { userPK, MUSIC_SK } from "@/lib/dynamodb/schema";

/**
 * Admin page for inspecting all profiles and their data status.
 * Accessible at: /inspect/a8f3d9c1
 *
 * Not linked anywhere - keep this URL private.
 */

// Force dynamic rendering - don't prerender at build time
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ProfileData {
  handle: string;
  displayName: string | null;
  isPublic: boolean;
  publishedAt: number | null;
  lastfmUsername: string | null;
  spotifyConnected: boolean;
  hasArtists: boolean;
  hasAlbums: boolean;
  hasTracks: boolean;
  artistCount: number;
  albumCount: number;
  trackCount: number;
}

async function getAllProfiles(): Promise<ProfileData[]> {
  // Scan for all user records (pk = sk pattern)
  const scanResult = await dynamoDocumentClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "pk = sk AND begins_with(pk, :userPrefix)",
      ExpressionAttributeValues: {
        ":userPrefix": "USER#",
      },
    })
  );

  const users = scanResult.Items || [];

  // Batch fetch music data for all users
  const musicKeys = users.flatMap((user) => {
    const pk = user.pk as string;
    return [
      { pk, sk: MUSIC_SK.ARTISTS },
      { pk, sk: MUSIC_SK.ALBUMS },
      { pk, sk: MUSIC_SK.TRACKS },
    ];
  });

  let musicDataMap = new Map<string, { artists?: number; albums?: number; tracks?: number }>();

  if (musicKeys.length > 0) {
    // BatchGetCommand has a limit of 100 items, so we need to chunk
    const chunks: typeof musicKeys[] = [];
    for (let i = 0; i < musicKeys.length; i += 100) {
      chunks.push(musicKeys.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      const musicResult = await dynamoDocumentClient.send(
        new BatchGetCommand({
          RequestItems: {
            [TABLE_NAME]: {
              Keys: chunk,
            },
          },
        })
      );

      (musicResult.Responses?.[TABLE_NAME] || []).forEach((item) => {
        const pk = item.pk as string;
        const sk = item.sk as string;
        const userId = pk.replace("USER#", "");

        if (!musicDataMap.has(userId)) {
          musicDataMap.set(userId, {});
        }

        const userMusic = musicDataMap.get(userId)!;
        const data = item.data as any[];

        if (sk === MUSIC_SK.ARTISTS) {
          userMusic.artists = data?.length || 0;
        } else if (sk === MUSIC_SK.ALBUMS) {
          userMusic.albums = data?.length || 0;
        } else if (sk === MUSIC_SK.TRACKS) {
          userMusic.tracks = data?.length || 0;
        }
      });
    }
  }

  // Build profile data
  const profiles: ProfileData[] = users.map((user) => {
    const pk = user.pk as string;
    const userId = pk.replace("USER#", "");
    const musicData = musicDataMap.get(userId) || {};

    return {
      handle: (user.handle as string) || "N/A",
      displayName: (user.displayName as string) || null,
      isPublic: user.isPublic === true,
      publishedAt: (user.publishedAt as number) || null,
      lastfmUsername: (user.lastfmUsername as string) || null,
      spotifyConnected: user.spotifyConnected === true,
      hasArtists: (musicData.artists || 0) > 0,
      hasAlbums: (musicData.albums || 0) > 0,
      hasTracks: (musicData.tracks || 0) > 0,
      artistCount: musicData.artists || 0,
      albumCount: musicData.albums || 0,
      trackCount: musicData.tracks || 0,
    };
  });

  // Sort by handle
  profiles.sort((a, b) => a.handle.localeCompare(b.handle));

  return profiles;
}

function formatTimestamp(timestamp: number | null): string {
  if (!timestamp) return "Never";
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminProfilesPage() {
  const profiles = await getAllProfiles();
  const publishedCount = profiles.filter(p => p.isPublic).length;
  const withMusicData = profiles.filter(p => p.hasArtists && p.hasTracks).length;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Profile Inspector
          </h1>
          <p className="text-sm text-gray-600">
            Total: {profiles.length} profiles | Published: {publishedCount} | With music data: {withMusicData}
          </p>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Handle
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Display Name
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Public
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Published At
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Music Service
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Artists
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Albums
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tracks
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {profiles.map((profile) => {
                  const musicService = profile.lastfmUsername
                    ? "Last.fm"
                    : profile.spotifyConnected
                    ? "Spotify"
                    : "None";

                  return (
                    <tr key={profile.handle} className={profile.isPublic ? "" : "bg-gray-50"}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <a
                          href={`/${profile.handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {profile.handle}
                        </a>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {profile.displayName || <span className="text-gray-400 italic">None</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {profile.isPublic ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatTimestamp(profile.publishedAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {musicService === "Last.fm" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Last.fm
                          </span>
                        )}
                        {musicService === "Spotify" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Spotify
                          </span>
                        )}
                        {musicService === "None" && (
                          <span className="text-gray-400 text-xs italic">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                        {profile.hasArtists ? (
                          <span className="text-green-600 font-medium">{profile.artistCount}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                        {profile.hasAlbums ? (
                          <span className="text-green-600 font-medium">{profile.albumCount}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                        {profile.hasTracks ? (
                          <span className="text-green-600 font-medium">{profile.trackCount}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <a
                          href={`/${profile.handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View →
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-blue-900 mb-2">Legend</h2>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• <strong>Public = Yes</strong>: Profile is published and visible on landing page (if has publishedAt)</li>
            <li>• <strong>Public = No</strong>: Profile is in draft mode (row has gray background)</li>
            <li>• <strong>Published At = Never</strong>: User hasn't clicked "Drop Anchor" button yet</li>
            <li>• <strong>Green numbers</strong>: Music data exists</li>
            <li>• <strong>Gray 0</strong>: No music data (user needs to click "Haul Up Anchor")</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
