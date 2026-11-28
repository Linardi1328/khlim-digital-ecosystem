import { redirect } from "next/navigation";
import {
  buildProgrammesRedirectTarget,
  type ProgrammesRedirectSearchParams,
} from "../../lib/programmes-redirect";

export default async function ProgrammesRedirectPage({
  searchParams,
}: {
  searchParams: Promise<ProgrammesRedirectSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  redirect(buildProgrammesRedirectTarget(resolvedSearchParams));
}
