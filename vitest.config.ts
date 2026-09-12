import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // VitePress's browser modules use extensionless imports. Transform them
    // as Vite does so the native outline contracts run against installed code.
    server: { deps: { inline: [/vitepress/] } },
  },
})
