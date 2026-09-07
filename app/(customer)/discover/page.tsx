import { prisma } from "@/lib/prisma";
import { ExploreFlow } from "@/components/customer/ExploreFlow";

export const dynamic = "force-dynamic";

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: { location?: string; mode?: string };
}) {
  const locations = await prisma.location.findMany({ orderBy: { name: "asc" } });

  return (
    <ExploreFlow
      locations={locations.map((l) => ({ id: l.id, name: l.name }))}
      presetLocationId={searchParams.location}
      presetMode={searchParams.mode as "delivery" | "pickup" | "dine-in" | undefined}
    />
  );
}
