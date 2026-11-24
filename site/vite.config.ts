import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { siteConfig } from './site.config';
import { contentPlugin } from './plugins/content';
import { repoStaticPlugin } from './plugins/static';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig({
  base: siteConfig.base,
  plugins: [
    react(),
    contentPlugin({ repoRoot, config: siteConfig }),
    repoStaticPlugin({ repoRoot, base: siteConfig.base }),
  ],
  server: {
    fs: { allow: [repoRoot] },
  },
});
