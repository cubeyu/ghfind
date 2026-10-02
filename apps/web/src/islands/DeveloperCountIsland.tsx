import { DeveloperCount } from "@/components/DeveloperCount";
import { IslandRoot } from "./IslandRoot";
import type { WithIntl } from "./types";

export function DeveloperCountIsland({ intl }: WithIntl) {
  return <IslandRoot intl={intl}><DeveloperCount /></IslandRoot>;
}
