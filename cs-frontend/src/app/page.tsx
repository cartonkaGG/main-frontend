import { HomePage } from "@/components/HomePage";
import { fetchHomeBootstrap } from "@/lib/homeBootstrap";

export default async function Home() {
  const { cases, siteUi } = await fetchHomeBootstrap();
  return <HomePage initialCases={cases} initialSiteUi={siteUi} />;
}
