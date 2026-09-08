// archived/ holds two kinds of page under one directory. 106 transcribe an
// original from the association's paper archive and say so — those carry
// notes like "照录，含原文笔误", where the typo is deliberate and correcting
// it falsifies the record. 51 are records a cohort wrote itself, where a typo
// is just a typo. A path rule cannot tell them apart; the provenance can.
const OWN_RECORD = '协会自有记录'

interface ArchiveNote {
  source?: string
}

// The original's provenance when this page transcribes one, and undefined
// when the page is the association's own record or not an archive page.
export function transcribedFrom(frontmatter: unknown): string | undefined {
  const source = (frontmatter as { archive?: ArchiveNote } | undefined)?.archive?.source
  if (typeof source !== 'string' || !source.trim() || source.startsWith(OWN_RECORD))
    return undefined
  return source
}

export function reviewNoteFor(source: string): string {
  return `这一页照录自「${source}」，请确认改动只修正了转写错误，没有改动原件内容`
}
