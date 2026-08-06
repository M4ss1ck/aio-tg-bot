/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  serverExternalPackages: ["@resvg/resvg-js"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.massick.dev",
        pathname: "/api/media/**",
      },
    ],
  },
};

export default nextConfig;
