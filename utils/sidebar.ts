import { readdirSync } from "fs"
import path from "path"

export const scanDir = (dirname: string) => {
  const dirpath = path.resolve(__dirname, `../${dirname}`)
  const res = readdirSync(dirpath)

  const markdownFileNames = res.filter((name) => name.endsWith('.md'))

  return markdownFileNames.map(v => {
    return {
      filename: v,
      link: path.join(dirname, v)
    }
  })
}