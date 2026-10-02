import { useTranslations } from "next-intl";
import { VsView } from "@/components/pages/VsView";
import { IslandRoot } from "./IslandRoot";
import type { WithIntl, WithoutT } from "./types";

type Props = Omit<WithoutT<typeof VsView>, "tDim" | "tTier">;

function VsBody(props: Props) {
  return <VsView {...props} t={useTranslations("vs")} tDim={useTranslations("dimensions")} tTier={useTranslations("tiers")} />;
}

export function VsIsland({ intl, ...props }: WithIntl<Props>) {
  return <IslandRoot intl={intl}><VsBody {...props} /></IslandRoot>;
}
