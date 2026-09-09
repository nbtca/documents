import { afterEach, describe, expect, it, vi } from 'vitest'
import { branchNameFor, decodeContent, encodeContent, ensureFork, openPullRequest } from './github'

interface Reply { status?: number, body?: unknown }
interface Seen { route: string, body?: any }

function stubGitHub(routes: Array<[string, Reply | Reply[]]>): Seen[] {
  const queues = routes.map(([route, reply]) => ({
    match: new RegExp(`^${route.replace(/\*/g, '[^ ]*')}$`),
    replies: Array.isArray(reply) ? [...reply] : [reply],
  }))
  const seen: Seen[] = []

  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const route = `${init?.method ?? 'GET'} ${url.replace('https://api.github.com', '')}`
    seen.push({ route, body: init?.body ? JSON.parse(init.body as string) : undefined })

    const queue = queues.find(candidate => candidate.match.test(route))
    if (!queue)
      return new Response('unrouted', { status: 500 })

    const reply = queue.replies.length > 1 ? queue.replies.shift()! : queue.replies[0]
    return new Response(JSON.stringify(reply.body ?? {}), { status: reply.status ?? 200 })
  })

  return seen
}

const NOW = () => Promise.resolve()
const UPSTREAM = { owner: 'nbtca', name: 'documents' }

describe('content encoding', () => {
  it('survives a round trip through base64', () => {
    const markdown = '# 第七届计算机知识竞赛\n\n〔编者〕原件为打印版，选项后括号留空。\n'
    expect(decodeContent(encodeContent(markdown))).toBe(markdown)
  })

  it('reads the padded, newline-wrapped base64 the API returns', () => {
    const encoded = encodeContent('维修日').replace(/(.{4})/g, '$1\n')
    expect(decodeContent(encoded)).toBe('维修日')
  })
})

describe('branch name', () => {
  const at = new Date('2026-08-29T11:30:00Z')

  it('keeps the page readable in the branch', () => {
    expect(branchNameFor('tutorial/2025/edu-email.md', at)).toBe('edit/tutorial-2025-edu-email-20260829113000')
  })

  it('leaves no empty ref component when the filename is all CJK', () => {
    expect(branchNameFor('archived/2014/第七届.md', at)).toBe('edit/archived-2014-20260829113000')
  })

  it('still names a branch when nothing survives slugging', () => {
    expect(branchNameFor('第七届.md', at)).toBe('edit/page-20260829113000')
  })

  // A minute-precision stamp collided when the same page was submitted twice
  // in a row, and GitHub refused the second branch.
  it('separates two submits of the same page a second apart', () => {
    const later = new Date('2026-08-29T11:30:01Z')
    const second = branchNameFor('tutorial/2025/edu-email.md', later)
    expect(branchNameFor('tutorial/2025/edu-email.md', at)).not.toBe(second)
  })
})

describe('forking', () => {
  afterEach(() => vi.unstubAllGlobals())

  const FORKED = { body: { owner: { login: 'mia' }, name: 'documents' }, status: 202 }
  const ME = ['GET /user', { body: { login: 'mia' } }] as const
  const MINE = { body: { fork: true, parent: { full_name: 'nbtca/documents' } } }

  // POST /forks queues a sync job on a fork that already exists, and the fork
  // refuses ref writes while it runs — the whole first submit then fails.
  it('does not ask GitHub to fork again when the fork is already there', async () => {
    const seen = stubGitHub([
      ME,
      ['GET /repos/mia/documents', MINE],
      ['POST /repos/mia/documents/merge-upstream', { body: { merge_type: 'fast-forward' } }],
    ])

    expect(await ensureFork('t', UPSTREAM, NOW)).toEqual({ owner: 'mia', name: 'documents' })
    expect(seen.some(call => call.route === 'POST /repos/nbtca/documents/forks')).toBe(false)
  })

  // Measured live: with the fork fifteen months behind, writing the ref 404s;
  // one fast-forward and the identical write returns 201.
  it('fast-forwards a fork that has fallen behind before writing to it', async () => {
    const seen = stubGitHub([
      ME,
      ['GET /repos/mia/documents', MINE],
      ['POST /repos/mia/documents/merge-upstream', { body: { merge_type: 'fast-forward' } }],
    ])

    await ensureFork('t', UPSTREAM, NOW)
    expect(seen.at(-1)).toMatchObject({
      route: 'POST /repos/mia/documents/merge-upstream',
      body: { branch: 'main' },
    })
  })

  it('goes on submitting when the fork cannot be fast-forwarded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    stubGitHub([
      ME,
      ['GET /repos/mia/documents', MINE],
      ['POST /repos/mia/documents/merge-upstream', { status: 409 }],
    ])

    expect(await ensureFork('t', UPSTREAM, NOW)).toEqual({ owner: 'mia', name: 'documents' })
  })

  it('forks when a repository of that name is somebody else, not the fork', async () => {
    const seen = stubGitHub([
      ME,
      ['GET /repos/mia/documents', { body: { fork: false } }],
      ['POST /repos/nbtca/documents/forks', FORKED],
      ['GET /repos/mia/documents/git/ref/heads/main', { body: { object: { sha: 'a' } } }],
    ])

    await ensureFork('t', UPSTREAM, NOW)
    expect(seen.some(call => call.route === 'POST /repos/nbtca/documents/forks')).toBe(true)
  })

  it('names the fork from what GitHub actually created', async () => {
    stubGitHub([
      ME,
      ['GET /repos/mia/documents', { status: 404 }],
      ['POST /repos/nbtca/documents/forks', FORKED],
      ['GET /repos/mia/documents/git/ref/heads/main', { body: { object: { sha: 'a' } } }],
    ])

    expect(await ensureFork('t', UPSTREAM, NOW)).toEqual({ owner: 'mia', name: 'documents' })
  })

  it('waits out the queue instead of failing on a first-time fork', async () => {
    const seen = stubGitHub([
      ME,
      ['GET /repos/mia/documents', { status: 404 }],
      ['POST /repos/nbtca/documents/forks', FORKED],
      ['GET /repos/mia/documents/git/ref/heads/main', [
        { status: 404 },
        { status: 404 },
        { body: { object: { sha: 'a' } } },
      ]],
    ])

    await ensureFork('t', UPSTREAM, NOW)
    expect(seen.filter(call => call.route.endsWith('/git/ref/heads/main'))).toHaveLength(3)
  })

  it('gives up rather than looping forever', async () => {
    stubGitHub([
      ME,
      ['GET /repos/mia/documents', { status: 404 }],
      ['POST /repos/nbtca/documents/forks', FORKED],
      ['GET /repos/mia/documents/git/ref/heads/main', { status: 404 }],
    ])

    await expect(ensureFork('t', UPSTREAM, NOW)).rejects.toThrow(/副本/)
  })
})

describe('pull request from a fork', () => {
  afterEach(() => vi.unstubAllGlobals())

  const FORK = { owner: 'mia', name: 'documents' }

  async function open() {
    const seen = stubGitHub([
      ['GET /repos/nbtca/documents/git/ref/heads/main', { body: { object: { sha: 'upstream-tip' } } }],
      ['GET /repos/nbtca/documents/git/commits/upstream-tip', { body: { tree: { sha: 'upstream-tree' } } }],
      ['POST /repos/mia/documents/git/blobs', { body: { sha: 'blob' } }],
      ['POST /repos/mia/documents/git/trees', { body: { sha: 'tree' } }],
      ['POST /repos/mia/documents/git/commits', { body: { sha: 'commit' } }],
      ['POST /repos/mia/documents/git/refs', { body: {} }],
      ['POST /repos/nbtca/documents/pulls', { body: { number: 7, html_url: 'https://x/7' } }],
    ])

    const pull = await openPullRequest('t', UPSTREAM, FORK, {
      files: [{ path: 'tutorial/2025/edu-email.md', content: '# 教育邮箱' }],
      title: 'docs: fix a typo',
      body: 'body',
      branch: 'edit/page',
    })

    return { seen, pull }
  }

  // Cutting from the tip at submit time turns "someone merged a change to
  // this page while I was writing" into a clean single-file diff that quietly
  // reverts them. Branching from what the writer read lets git see it.
  it('branches from where the writing started, not from the tip', async () => {
    const seen = stubGitHub([
      ['GET /repos/nbtca/documents/git/ref/heads/main', { body: { object: { sha: 'moved-on' } } }],
      ['GET /repos/nbtca/documents/git/commits/read-this', { body: { tree: { sha: 'read-tree' } } }],
      ['POST /repos/mia/documents/git/blobs', { body: { sha: 'blob' } }],
      ['POST /repos/mia/documents/git/trees', { body: { sha: 'tree' } }],
      ['POST /repos/mia/documents/git/commits', { body: { sha: 'commit' } }],
      ['POST /repos/mia/documents/git/refs', { body: {} }],
      ['POST /repos/nbtca/documents/pulls', { body: { number: 7, html_url: 'https://x/7' } }],
    ])

    await openPullRequest('t', UPSTREAM, FORK, {
      files: [{ path: 'tutorial/2025/edu-email.md', content: '# 教育邮箱' }],
      title: 'docs: fix a typo',
      body: 'body',
      branch: 'edit/page',
      base: 'read-this',
    })

    expect(seen.find(call => call.route.endsWith('/git/trees')))
      .toMatchObject({ body: { base_tree: 'read-tree' } })
    expect(seen.find(call => call.route.endsWith('/git/commits') && call.body))
      .toMatchObject({ body: { parents: ['read-this'] } })
    // The tip is never consulted when the starting point is known.
    expect(seen.some(call => call.route.endsWith('/git/ref/heads/main'))).toBe(false)
  })

  it('branches off upstream but writes into the fork', async () => {
    const { seen } = await open()

    expect(seen.find(call => call.route.endsWith('/git/trees'))).toMatchObject({
      route: 'POST /repos/mia/documents/git/trees',
      body: { base_tree: 'upstream-tree' },
    })
    expect(seen.find(call => call.route.endsWith('/git/commits') && call.body))
      .toMatchObject({ body: { parents: ['upstream-tip'] } })
  })

  it('opens the pull request upstream with a cross-repository head', async () => {
    const { seen, pull } = await open()

    expect(seen.at(-1)).toMatchObject({
      route: 'POST /repos/nbtca/documents/pulls',
      body: { head: 'mia:edit/page', base: 'main', maintainer_can_modify: true },
    })
    expect(pull).toEqual({ number: 7, url: 'https://x/7', branch: 'edit/page' })
  })

  // Observed against the live API: POST /forks answers 202 for a fork that
  // already exists, and the ref write 404s until that job finishes.
  it('waits out the fork refresh that makes the first ref write 404', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const seen = stubGitHub([
      ['GET /repos/nbtca/documents/git/ref/heads/main', { body: { object: { sha: 'upstream-tip' } } }],
      ['GET /repos/nbtca/documents/git/commits/upstream-tip', { body: { tree: { sha: 'upstream-tree' } } }],
      ['POST /repos/mia/documents/git/blobs', { body: { sha: 'blob' } }],
      ['POST /repos/mia/documents/git/trees', { body: { sha: 'tree' } }],
      ['POST /repos/mia/documents/git/commits', { body: { sha: 'commit' } }],
      ['POST /repos/mia/documents/git/refs', [{ status: 404 }, { status: 404 }, { body: {} }]],
      ['POST /repos/nbtca/documents/pulls', { body: { number: 7, html_url: 'https://x/7' } }],
    ])

    const pull = await openPullRequest('t', UPSTREAM, FORK, {
      files: [{ path: 'tutorial/2025/edu-email.md', content: '# 教育邮箱' }],
      title: 'docs: fix a typo',
      body: 'body',
      branch: 'edit/page',
    }, NOW)

    expect(seen.filter(call => call.route.endsWith('/git/refs'))).toHaveLength(3)
    expect(pull.number).toBe(7)
  })

  it('tells a member what to do rather than handing over GitHub JSON', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    stubGitHub([
      ['GET /repos/nbtca/documents/git/ref/heads/main', {
        status: 404,
        body: { message: 'Not Found', documentation_url: 'https://docs.github.com/rest/git/refs' },
      }],
    ])

    const error = await openPullRequest('t', UPSTREAM, FORK, {
      files: [{ path: 'a.md', content: 'x' }],
      title: 't',
      body: 'b',
      branch: 'edit/page',
    }, NOW).then(() => undefined, (reason: Error) => reason)

    expect(error?.message).toBe('找不到这个位置，可能刚被人改动过。刷新页面重新打开，再提交一次。')
  })
})
