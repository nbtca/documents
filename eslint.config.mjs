import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  typescript: true,
}, {
  // Archived pages transcribe scanned Word documents verbatim. The originals
  // indent with U+3000, and normalising it away would silently edit the record.
  files: ['archived/**/*.md'],
  rules: {
    'no-irregular-whitespace': 'off',
  },
})
