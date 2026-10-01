/**
 * Astro island entry points. Each wraps an existing React component from the
 * Next app (`src/components`) in `IslandRoot`, so the component runs unchanged
 * through the next-intl / navigation shims.
 */
import { BlogCommentBubbles } from "@/components/BlogCommentBubbles";
import { CollectionCommentBubbles } from "@/components/CollectionCommentBubbles";
import { GlobalSearch } from "@/components/GlobalSearch";
import { SponsorView } from "@/components/pages/SponsorView";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LoginNudge } from "@/components/LoginNudge";
import { NavAuth } from "@/components/NavAuth";
import { PoweredByLobeHub, SponsorStrip } from "@/components/Sponsor";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTranslations } from "next-intl";
import { IslandRoot, type IslandIntl } from "./IslandRoot";

type WithIntl<P = object> = P & { intl: IslandIntl };

export function SearchIsland({ intl, mobile }: WithIntl<{ mobile?: boolean }>) {
  return <IslandRoot intl={intl}><GlobalSearch mobile={mobile} /></IslandRoot>;
}

export function LanguageIsland({ intl }: WithIntl) {
  return <IslandRoot intl={intl}><LanguageSwitcher /></IslandRoot>;
}

export function ThemeIsland({ intl }: WithIntl) {
  return <IslandRoot intl={intl}><ThemeToggle /></IslandRoot>;
}

export function AccountIsland({ intl, repoHref, repoLabel, repoTitle }: WithIntl<{ repoHref: string; repoLabel: string; repoTitle: string }>) {
  return <IslandRoot intl={intl}><NavAuth repoHref={repoHref} repoLabel={repoLabel} repoTitle={repoTitle} /></IslandRoot>;
}

export function SponsorStripIsland({ intl }: WithIntl) {
  return <IslandRoot intl={intl}><SponsorStrip /></IslandRoot>;
}

export function FooterSponsorIsland({ intl }: WithIntl) {
  return <IslandRoot intl={intl}><PoweredByLobeHub /></IslandRoot>;
}

export function LoginNudgeIsland({ intl }: WithIntl) {
  return <IslandRoot intl={intl}><LoginNudge /></IslandRoot>;
}

export function BlogCommentsIsland({ intl, lang, postSlug }: WithIntl<{ lang: "zh" | "en"; postSlug: string }>) {
  return <IslandRoot intl={intl}><BlogCommentBubbles lang={lang} postSlug={postSlug} /></IslandRoot>;
}

export function CollectionCommentsIsland({ intl, lang, collectionSlug }: WithIntl<{ lang: "zh" | "en"; collectionSlug: string }>) {
  return <IslandRoot intl={intl}><CollectionCommentBubbles lang={lang} collectionSlug={collectionSlug} /></IslandRoot>;
}

/**
 * The /sponsor page body. Unlike the other content pages it hydrates: its
 * sponsor-holder lists load live records in the browser (SponsorHolders).
 */
function SponsorPageBody() {
  return <SponsorView t={useTranslations("sponsor")} />;
}

export function SponsorPageIsland({ intl }: WithIntl) {
  return <IslandRoot intl={intl}><SponsorPageBody /></IslandRoot>;
}
