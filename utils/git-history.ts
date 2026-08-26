import { execFileSync } from 'node:child_process'

export interface LastCommit {
  sha: string
  date: string
  login: string | undefined
  name: string
}

// Only the API resolves an arbitrary email, and that request is what we avoid.
const LOGIN_BY_EMAIL: Record<string, string> = {
  'contact@m1ng.space': 'm1ngsama',
  'miam1gh0st.ming@gmail.com': 'm1ngsama',
  '1992584620@nbt.edu.cn': 'm1ngsama',
  'clas.wen@icloud.com': 'wen-templari',
  'q79142466@163.com': 'wen-templari',
  'lazulikao233@outlook.com': 'LazuliKao',
  'lwangluoab@163.com': 'gentlelyyli',
  '29951517@qq.com': 'Yuna-Celisse',
  '29951517@nbt.edu.cn': 'Yuna-Celisse',
}

const NOREPLY = /^(?:\d+\+)?([\w-]+)@users\.noreply\.github\.com$/i

export function loginFromEmail(email: string): string | undefined {
  const noreply = email.match(NOREPLY)
  if (noreply)
    return noreply[1]
  return LOGIN_BY_EMAIL[email.toLowerCase()]
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
  return { sha, name, date, login: loginFromEmail(email) }
}
