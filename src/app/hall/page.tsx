import { HallPage } from "@/components/landing/HallPage";
import { parseLocaleParam } from "@/lib/i18n";

export default async function HallRoute({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  const sp = await searchParams;
  return <HallPage locale={parseLocaleParam(sp.locale)} />;
}
