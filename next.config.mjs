/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "wstatic-prod-boc.krafton.com",
      },
      {
        protocol: "https",
        hostname: "wstatic-prod.pubg.com",
      },
      {
        protocol: "https",
        hostname: "battlegrounds.party",
      },
      {
        protocol: "https",
        hostname: "cdn.pubgitems.info",
      },
      {
        protocol: "https",
        hostname: "pubgitems.info",
      },
      {
        protocol: "https",
        hostname: "avatars.steamstatic.com",
      },
      {
        protocol: "https",
        hostname: "avatars.akamai.steamstatic.com",
      },
      {
        protocol: "https",
        hostname: "steamcdn-a.akamaihd.net",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      }
    ],
  },
};

export default nextConfig;
