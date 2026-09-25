// Vite fingerprints a content image as name.<hash>.webp and serves it from
// /assets. The editor preview recompiles the markdown source, which still says
// ./assets/name.webp, so the preview has to borrow the URL the built page uses.

const HASHED = /^(.*)\.([\w-]{8})\.(webp|png|jpe?g|gif|svg)$/i

export function publishedAssetMap(srcs: Iterable<string>): Map<string, string> {
  const map = new Map<string, string>()
  for (const src of srcs) {
    const file = src.split('?')[0]?.split('/').pop()
    if (!file)
      continue
    let decoded = file
    try {
      decoded = decodeURIComponent(file)
    }
    catch {
      // A broken escape is not one of our asset names.
    }
    const match = decoded.match(HASHED)
    if (!match)
      continue
    map.set(`${match[1]}.${match[3].toLowerCase()}`, src)
  }
  return map
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Swap a source path that ends in the original filename for the hashed URL.
// A longer name is applied first, and a filename that merely ends with a
// shorter one (my-meeting.webp) is left alone.
export function citePublishedAssets(html: string, published: Map<string, string>): string {
  const names = [...published.keys()].sort((a, b) => b.length - a.length)
  return names.reduce((out, name) => {
    const url = published.get(name)
    if (!url)
      return out
    // The filename has to be its own path segment. my-meeting.webp is not meeting.webp.
    const pattern = new RegExp(`(^|["'])(?:[^"'\\s]*?/)*${escapeRegExp(name)}(?=["'])`, 'g')
    return out.replace(pattern, (_match, prefix: string) => `${prefix}${url}`)
  }, html)
}

export function previewSources(
  html: string,
  published: Map<string, string>,
  pending: Iterable<[string, string]> = [],
): string {
  let out = citePublishedAssets(html, published)
  const ordered = [...pending].sort((a, b) => b[0].length - a[0].length)
  for (const [path, url] of ordered) {
    out = out
      .replaceAll(`"${path}"`, `"${url}"`)
      .replaceAll(`'${path}'`, `'${url}'`)
  }
  return out
}
