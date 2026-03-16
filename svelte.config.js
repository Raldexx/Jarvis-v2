import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      // Tauri expects a flat `build/` folder
      pages:  'build',
      assets: 'build',
      fallback: undefined,
      precompress: false,
      strict: true
    }),
    // No server-side rendering needed in a Tauri app
    prerender: { entries: ['*'] }
  }
};

export default config;
