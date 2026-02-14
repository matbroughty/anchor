import { LandingHero } from "@/app/components/LandingHero";
import { RecentProfiles } from "@/app/components/RecentProfiles";
import { HowItWorks } from "@/app/components/HowItWorks";
import { LandingFooter } from "@/app/components/LandingFooter";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anchor.band - Drop your anchor. Publish your music taste.",
  description:
    "Turn your listening history and favourite bands into a public page worth sharing.",
  openGraph: {
    title: "Anchor.band",
    description: "Drop your anchor. Publish your music taste.",
    images: ["/og-image.png"],
    siteName: "Anchor.band",
  },
  twitter: {
    card: "summary_large_image",
    title: "Anchor.band",
    description: "Drop your anchor. Publish your music taste.",
    images: ["/og-image.png"],
  },
};

// Revalidate every 10 seconds to show new profiles quickly
// Combined with unstable_noStore() in getRecentProfiles, this ensures fresh data
export const revalidate = 10;

export default function LandingPage() {
  return (
    <>
      <LandingHero />
      <RecentProfiles />
      <HowItWorks />
      <LandingFooter />
    </>
  );
}
