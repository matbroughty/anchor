import { LandingHero } from "@/app/components/LandingHero";
import { RecentProfiles } from "@/app/components/RecentProfiles";
import { LandingFooter } from "@/app/components/LandingFooter";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anchor.band - Your music profile, tastefully done",
  description:
    "Create a shareable music profile page. Connect Spotify, generate tasteful content, and share your taste.",
  openGraph: {
    title: "Anchor.band",
    description: "Your music profile, tastefully done",
    images: ["/og-image.png"],
    siteName: "Anchor.band",
  },
  twitter: {
    card: "summary_large_image",
    title: "Anchor.band",
    description: "Your music profile, tastefully done",
    images: ["/og-image.png"],
  },
};

export default function LandingPage() {
  return (
    <>
      <LandingHero />
      <RecentProfiles />
      <LandingFooter />
    </>
  );
}
