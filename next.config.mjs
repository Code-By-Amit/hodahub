/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['nontragical-untaxing-laurette.ngrok-free.dev'],
  reactCompiler: true,
  images: {
    loader: 'custom',
    loaderFile: './src/lib/image-loader.js',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      }
    ],
  },
};

export default nextConfig;
