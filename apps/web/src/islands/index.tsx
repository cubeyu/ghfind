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
import { TalentDirectory } from "@/components/talent/TalentDirectory";
import { ResumeBuilder } from "@/components/resume/ResumeBuilder";
import { ProjectAnalysisStatus } from "@/components/ProjectAnalysisStatus";
import { FollowingView } from "@/components/pages/FollowingView";
import { IntegrationsView } from "@/components/pages/IntegrationsView";
import { VsIndexView } from "@/components/pages/VsIndexView";
import { LeaderboardPageView } from "@/components/pages/LeaderboardPageView";
import { AdvxView } from "@/components/pages/AdvxView";
import { ProjectsView } from "@/components/pages/ProjectsView";
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

export function TalentIsland({ intl, ...props }: WithIntl<React.ComponentProps<typeof TalentDirectory>>) {
  return <IslandRoot intl={intl}><TalentDirectory {...props} /></IslandRoot>;
}

export function ResumeIsland({ intl, zh }: WithIntl<{ zh: boolean }>) {
  return <IslandRoot intl={intl}><ResumeBuilder zh={zh} /></IslandRoot>;
}

export function ProjectAnalysisIsland({ intl, initial }: WithIntl<React.ComponentProps<typeof ProjectAnalysisStatus>>) {
  return <IslandRoot intl={intl}><ProjectAnalysisStatus initial={initial} /></IslandRoot>;
}

function FollowingBody() {
  return <FollowingView t={useTranslations("follow")} />;
}

export function FollowingPageIsland({ intl }: WithIntl) {
  return <IslandRoot intl={intl}><FollowingBody /></IslandRoot>;
}

function IntegrationsBody(props: Omit<React.ComponentProps<typeof IntegrationsView>, "t">) {
  return <IntegrationsView {...props} t={useTranslations("integrations")} />;
}

export function IntegrationsPageIsland({ intl, ...props }: WithIntl<Omit<React.ComponentProps<typeof IntegrationsView>, "t">>) {
  return <IslandRoot intl={intl}><IntegrationsBody {...props} /></IslandRoot>;
}

type WithoutT<C extends (props: never) => unknown> = Omit<Parameters<C>[0], "t">;

function VsIndexBody(props: WithoutT<typeof VsIndexView>) {
  return <VsIndexView {...props} t={useTranslations("vs")} />;
}
export function VsIndexIsland({ intl, ...props }: WithIntl<WithoutT<typeof VsIndexView>>) {
  return <IslandRoot intl={intl}><VsIndexBody {...props} /></IslandRoot>;
}

function LeaderboardBody(props: WithoutT<typeof LeaderboardPageView>) {
  return <LeaderboardPageView {...props} t={useTranslations("leaderboard")} />;
}
export function LeaderboardIsland({ intl, ...props }: WithIntl<WithoutT<typeof LeaderboardPageView>>) {
  return <IslandRoot intl={intl}><LeaderboardBody {...props} /></IslandRoot>;
}

export function AdvxIsland({ intl, ...props }: WithIntl<Parameters<typeof AdvxView>[0]>) {
  return <IslandRoot intl={intl}><AdvxView {...props} /></IslandRoot>;
}

function ProjectsBody(props: WithoutT<typeof ProjectsView>) {
  return <ProjectsView {...props} t={useTranslations("projectBoards")} />;
}
export function ProjectsIsland({ intl, ...props }: WithIntl<WithoutT<typeof ProjectsView>>) {
  return <IslandRoot intl={intl}><ProjectsBody {...props} /></IslandRoot>;
}
