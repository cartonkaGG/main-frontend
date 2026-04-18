/** @type {import('next').NextConfig} */

/**
 * Хости зображень скінів/кейсів (Steam CDN — у користувачів у БД часто різні дзеркала).
 * Якщо хосту немає тут, Next/Image відмовиться завантажувати картинку (порожня картка).
 */
const remoteImageHosts = [
  "community.cloudflare.steamstatic.com",
  "cdn.cloudflare.steamstatic.com",
  "store.cloudflare.steamstatic.com",
  "community.fastly.steamstatic.com",
  "cdn.fastly.steamstatic.com",
  "community.akamai.steamstatic.com",
  "community.edgecast.steamstatic.com",
  "steamcommunity-a.akamaihd.net",
  "steamcdn-a.akamaihd.net",
  "cdn.akamai.steamstatic.com",
  "store.akamai.steamstatic.com",
  "shared.akamai.steamstatic.com",
  "steamuserimages-a.akamaihd.net",
  "avatars.akamai.steamstatic.com",
  "avatars.fastly.steamstatic.com",
  "avatars.steamstatic.com",
  "media.steampowered.com",
  "store.steampowered.com",
  "cdn.gamecontent.io",
  "cdn.freekassa.net",
  /** ImgBB (прямі посилання після завантаження в адмінці) */
  "i.ibb.co",
  "ibb.co",
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
