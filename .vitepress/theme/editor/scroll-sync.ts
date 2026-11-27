interface Mark {
  line: number
  y: number
}

// The same interpolation VS Code's Markdown preview uses: every rendered
// top-level block carries its source line, and positions in between are
// proportional to the distance between the two nearest marks.
function marks(pane: HTMLElement, lines: number): Mark[] {
  const box = pane.getBoundingClientRect()
  // The marker sits where the block's top margin starts; the reader sees the
  // block's border edge, so measure that.
  const found = [...pane.querySelectorAll<HTMLElement>('.nb-line')].map(mark => ({
    line: Number(mark.dataset.line),
    y: (mark.nextElementSibling ?? mark).getBoundingClientRect().top,
  }))
  return [{ line: 1, y: box.top - pane.scrollTop }, ...found, { line: lines + 1, y: box.top - pane.scrollTop + pane.scrollHeight }]
}

export function previewLineAtY(pane: HTMLElement, y: number, lines: number): number {
  const all = marks(pane, lines)
  const next = all.findIndex(mark => mark.y > y)
  if (next <= 0)
    return next === 0 ? 1 : lines
  const [from, to] = [all[next - 1], all[next]]
  return from.line + (to.line - from.line) * (y - from.y) / (to.y - from.y || 1)
}

export function previewYForLine(pane: HTMLElement, line: number, lines: number): number {
  const all = marks(pane, lines)
  const next = all.findIndex(mark => mark.line > line)
  if (next <= 0)
    return all[next === 0 ? 0 : all.length - 1].y
  const [from, to] = [all[next - 1], all[next]]
  return from.y + (to.y - from.y) * (line - from.line) / (to.line - from.line || 1)
}
