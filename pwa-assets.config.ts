import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#f6f0e4' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#f6f0e4' } },
  },
  images: ['public/favicon.svg'],
});
