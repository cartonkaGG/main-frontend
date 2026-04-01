/** @type {import('next').NextConfig} */

/** Хости зображень скінів/кейсів (Steam CDN, gamecontent тощо). */
const remoteImageHosts = [
  "community.cloudflare.steamstatic.com",
  "community.fastly.steamstatic.com",
  "steamcommunity-a.akamaihd.net",
  "steamcdn-a.akamaihd.net",
  "cdn.akamai.steamstatic.com",
  "store.akamai.steamstatic.com",
  "steamuserimages-a.akamaihd.net",
  "avatars.akamai.steamstatic.com",
  "avatars.fastly.steamstatic.com",
  "avatars.steamstatic.com",
  "cdn.gamecontent.io",
];

/** Проксі /api/* на бекенд — тоді з браузера можна бити в той самий origin (localhost:3000/api/...). Див. frontend/.env.example */
const backendProxy = String(
  process.env.BACKEND_PROXY_URL || process.env.API_INTERNAL_URL || "",
)
  .trim()
  .replace(/\/$/, "");

const nextConfig = {
  images: {
    remotePatterns: remoteImageHosts.flatMap((hostname) => [
      { protocol: "https", hostname, pathname: "/**" },
      { protocol: "http", hostname, pathname: "/**" },
    ]),
  },
  async rewrites() {
    if (!backendProxy) return [];
    return [{ source: "/api/:path*", destination: `${backendProxy}/api/:path*` }];
  },
};

export default nextConfig;
