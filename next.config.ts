import type { NextConfig } from 'next';

const pages = process.env.GITHUB_PAGES === '1';
const basePath = pages ? '/betmakers-horse-studio' : '';
const nextConfig: NextConfig = {
  ...(pages ? { output: 'export', assetPrefix: basePath, trailingSlash: true } : {}),
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
