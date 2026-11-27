import { describe, expect, it } from 'vitest'
import { cellStarts, formatTable } from './table'

describe('formatTable', () => {
  it('aligns columns, counting Chinese as two columns wide', () => {
    expect(formatTable('| 名称 | 数量 |\n|---|---|\n| 螺丝刀 | 2 |')).toBe([
      '| 名称   | 数量 |',
      '| ------ | ---- |',
      '| 螺丝刀 | 2    |',
    ].join('\n'))
  })

  it('fills missing cells so every row matches the header', () => {
    expect(formatTable('|a|b|c|\n|-|-|-|\n|1|\n')).toBe([
      '| a   | b   | c   |',
      '| --- | --- | --- |',
      '| 1   |     |     |',
    ].join('\n'))
  })

  it('keeps column alignment markers', () => {
    expect(formatTable('|左|中|右|\n|:-|:-:|-:|\n|a|b|c|')).toBe([
      '| 左  | 中  |  右 |',
      '| :-- | :-: | --: |',
      '| a   |  b  |   c |',
    ].join('\n'))
  })

  it('keeps escaped pipes inside a cell', () => {
    expect(formatTable('|命令|\n|-|\n|a \\| b|')).toBe('| 命令   |\n| ------ |\n| a \\| b |')
  })

  it('appends an empty row on request', () => {
    expect(formatTable('|a|\n|-|\n|1|', true).split('\n').at(-1)).toBe('|     |')
  })

  it('leaves a lone header line alone', () => {
    expect(formatTable('| a | b |')).toBe('| a | b |')
  })
})

describe('cellStarts', () => {
  it('finds where each cell\'s text begins', () => {
    expect(cellStarts('| 名称   | 数量 |')).toEqual([2, 9])
  })
})
