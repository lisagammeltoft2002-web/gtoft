import { CasePage, caseMetadata } from "@/components/case/CasePage";

export const metadata = caseMetadata("actionable-insights");

export default function Page() {
  return <CasePage slug="actionable-insights" />;
}
