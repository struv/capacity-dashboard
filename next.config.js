/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.xlsx$/,
      loader: 'file-loader',
      options: {
        name: '[name].[ext]',
      },
    });
    return config;
  },
};

module.exports = nextConfig; 