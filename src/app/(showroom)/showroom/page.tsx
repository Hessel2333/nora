import { ShowroomPage } from "@/features/showroom/showroom-page";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const enabledUnlessDisabled = (value: string | string[] | undefined) => value !== "0";
const enabled = (value: string | string[] | undefined) => value === "1";

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const kiosk = enabled(query.kiosk);

  return (
    <ShowroomPage
      options={{
        autoplay: kiosk || enabledUnlessDisabled(query.autoplay),
        loop: kiosk || enabledUnlessDisabled(query.loop),
        kiosk,
      }}
    />
  );
}
