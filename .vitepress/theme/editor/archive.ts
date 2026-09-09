// A transcription's typos are the record and must survive correction; a page
// the association wrote itself has ordinary typos. Only provenance tells them
// apart — archived/ holds both.
const OWN_RECORD = '协会自有记录'

interface ArchiveNote {
  source?: string
}

export function transcribedFrom(frontmatter: unknown): string | undefined {
  const source = (frontmatter as { archive?: ArchiveNote } | undefined)?.archive?.source
  if (typeof source !== 'string' || !source.trim() || source.startsWith(OWN_RECORD))
    return undefined
  return source
}

export function reviewNoteFor(source: string): string {
  return `这一页照录自「${source}」，请确认改动只修正了转写错误，没有改动原件内容`
}
