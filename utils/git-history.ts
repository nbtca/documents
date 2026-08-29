import { execFileSync } from 'node:child_process'

export interface Commit {
  sha: string
  date: string
  login: string | undefined
  name: string
  subject: string
}

// Keyed on the name: addresses are contact details the site strips elsewhere.
const LOGIN_BY_NAME: Record<string, string> = {
  '小明': 'm1ngsama',
  'm1ng': 'm1ngsama',
  'm1ngsama': 'm1ngsama',
  'miam1gh0st': 'm1ngsama',
  'clas': 'wen-templari',
  'clas wen': 'wen-templari',
  'templari': 'wen-templari',
  'lazulikao': 'LazuliKao',
  'skillful li': 'gentlelyyli',
  'ni jincheng': 'Yuna-Celisse',
  'yuna celisse': 'Yuna-Celisse',
  'yuna-celisse': 'Yuna-Celisse',
}

const NOREPLY = /^(?:\d+\+)?([\w-]+)@users\.noreply\.github\.com$/i

export function loginFor(email: string, name: string): string | undefined {
  const noreply = email.match(NOREPLY)
  if (noreply)
    return noreply[1]
  return LOGIN_BY_NAME[name.trim().toLowerCase()]
}

// Read at build time so the card costs no request: GitHub allows 60 an hour
// per address, and a campus shares one.
export function recentCommitsFor(file: string, count = 5): Commit[] {
  let out: string
  try {
    out = execFileSync(
      'git',
      ['log', `-${count}`, '--follow', '--format=%H%x00%aN%x00%aE%x00%aI%x00%s%x1e', '--', file],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    )
  }
  catch {
    return []
  }

  return out
    .split('\x1E')
    .map(entry => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [sha, name, email, date, subject] = entry.split('\0')
      return { sha, name, date, subject, login: loginFor(email, name) }
    })
}
