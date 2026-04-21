import { HomePage } from "@/components/HomePage";
import { fetchHomeBootstrap } from "@/lib/homeBootstrap";

export default async function Home() {
  const { cases } = await fetchHomeBootstrap();
  return <HomePage initialCases={cases} />;
}
