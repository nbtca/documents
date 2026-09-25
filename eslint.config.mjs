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
}, {
  // Markdown tables stay compact (`| --- |`), which is what readers write by
  // hand. Prettier pads every cell to the column width and offers no switch
  // for it, so markdown files skip the formatter.
  files: ['**/*.md'],
  rules: {
    'format/prettier': 'off',
  },
}, {
  // checks/ holds command-line verifiers; their report is the output.
  files: ['checks/**/*.mjs'],
  rules: {
    'no-console': 'off',
  },
})
