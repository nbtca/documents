export interface NoteBlock {
  type: string
  text: string
}

// A note that never closes, or closes and hands back mid-paragraph, is left
// alone: marking it would frame the document itself as commentary.
export function noteRanges(blocks: NoteBlock[]): Array<[number, number]> {
  const ranges: Array<[number, number]> = []
  let i = 0

  while (i < blocks.length) {
    const text = blocks[i].text.trim()
    const closes = text.endsWith('〕')
    const opens = blocks[i].type === 'paragraph_open'
      && text.startsWith('〔')
      && (closes || !text.includes('〕'))

    if (!opens) {
      i++
      continue
    }

    if (closes) {
      ranges.push([i, i])
      i++
      continue
    }

    let end = i + 1
    while (end < blocks.length
      && blocks[end].type !== 'heading_open'
      && !blocks[end].text.trim().endsWith('〕')) {
      end++
    }

    if (end >= blocks.length || blocks[end].type === 'heading_open') {
      i++
      continue
    }

    ranges.push([i, end])
    i = end + 1
  }

  return ranges
}
