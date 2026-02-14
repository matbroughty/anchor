import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getPublicProfile } from "@/lib/dynamodb/public-profile";
import { PublicProfile } from "@/app/components/PublicProfile";
import { auth } from "@/auth";

// ---------------------------------------------------------------------------
// ISR Configuration
// ---------------------------------------------------------------------------

/** Revalidate every hour (3600 seconds) */
export const revalidate = 3600;

/**
 * Dynamic params to prevent static generation of auth() calls
 * This allows ISR for the page content but ensures auth() is evaluated per-request
 */
export const dynamicParams = true;

// ---------------------------------------------------------------------------
// Types (Next.js 15 breaking change: params is a Promise)
// ---------------------------------------------------------------------------

type Props = {
  params: Promise<{ handle: string }>;
};

// ---------------------------------------------------------------------------
// Open Graph Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getPublicProfile(handle);

  if (!profile) {
    return {};
  }

  const title = `${profile.displayName ?? handle} on Anchor.band`;
  const description =
    profile.bio ?? `Check out ${profile.displayName ?? handle}'s music taste`;
  const url = `https://anchor.band/${handle}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "Anchor.band",
      images: [
        {
          url: "https://anchor.band/og-image.png",
          width: 1200,
          height: 630,
          alt: "Anchor.band",
        },
      ],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://anchor.band/og-image.png"],
    },
  };
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function HandlePage({ params }: Props) {
  const { handle } = await params;

  // Force dynamic rendering by accessing cookies - prevents caching of auth() calls
  // This is critical to prevent showing the wrong user's session
  await cookies();

  // Get session first to extract viewerHandle
  const session = await auth();
  const viewerHandle = session?.user?.handle ?? null;

  // Fetch profile with viewer information
  const profile = await getPublicProfile(handle, viewerHandle);

  if (!profile) {
    notFound();
  }

  // Check if the logged-in user owns this profile
  const isOwner = !!(session?.user?.handle && session.user.handle === handle);

  return (
    <PublicProfile
      displayName={profile.displayName ?? handle}
      bio={profile.bio}
      featuredArtists={profile.featuredArtists}
      artists={profile.artists}
      albums={profile.albums}
      tracks={profile.tracks}
      captions={profile.captions}
      isOwner={isOwner}
      viewCount={profile.viewCount}
      lastfmUsername={profile.lastfmUsername}
      spotifyUserId={profile.spotifyUserId}
    />
  );
}
