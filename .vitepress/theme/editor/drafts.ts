import type { PendingImage } from './backend'

export interface Draft {
  draft: string
  summary: string
  base?: string
  // The page's blob when the draft started, to tell whether it moved since.
  sha?: string
  destination?: string
  slug?: string
  images: PendingImage[]
}

const PREFIX = 'nb-draft:'

export function drafts(): string[] {
  try {
    return Object.keys(localStorage).filter(key => key.startsWith(PREFIX)).map(key => key.slice(PREFIX.length))
  }
  catch {
    return []
  }
}

export function keep(key: string, draft: Draft): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(draft))
  }
  catch {}
}

export function recall(key: string): Draft | undefined {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) as Draft : undefined
  }
  catch {
    return undefined
  }
}

export function forget(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  }
  catch {}
}
