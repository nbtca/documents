import { execFileSync } from 'node:child_process'

export interface LastCommit {
  sha: string
  date: string
  login: string | undefined
  name: string
}

// Keyed on the author name, not the address: only the API resolves an
// arbitrary email, and the addresses themselves are personal contact details
// the site strips everywhere else. Names are already published in the footer.
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

export function lastCommitFor(file: string): LastCommit | undefined {
  let out: string
  try {
    out = execFileSync(
      'git',
      ['log', '-1', '--follow', '--format=%H%x00%aN%x00%aE%x00%aI', '--', file],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim()
  }
  catch {
    return undefined
  }

  if (!out)
    return undefined

  const [sha, name, email, date] = out.split('\0')
  return { sha, name, date, login: loginFor(email, name) }
}
