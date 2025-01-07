/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.csv$/,
      use: [
        {
          loader: 'file-loader',
          options: {
            publicPath: '/_next/static/',
            outputPath: 'static/',
            name: '[name].[ext]',
          },
        },
      ],
    });
    return config;
  },
};

module.exports = nextConfig; 