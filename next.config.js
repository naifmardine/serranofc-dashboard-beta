/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      resolveAlias: {
        html2canvas: "html2canvas-pro",
      },
    },
  },

  // fallback caso algo rode no webpack (ou em build environments diferentes)
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      html2canvas: "html2canvas-pro",
    };
    return config;
  },
};

module.exports = nextConfig;
