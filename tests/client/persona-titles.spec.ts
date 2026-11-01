import { describe, expect, it } from 'vitest'
import type { GraphNode } from '../../src/graph.ts'
import { workflowSkills } from '../../client/workflow-skills.ts'

describe('persona display names', () => {
  it('labels all fourteen named perspectives in both languages, retaining invocation names and unknown fallbacks', () => {
    const names = [
      ['andrej-karpathy-perspective', '安德烈·卡帕西', 'Andrej Karpathy'],
      ['elon-musk-perspective', '埃隆·马斯克', 'Elon Musk'],
      ['feynman-perspective', '理查德·费曼', 'Richard Feynman'],
      ['ilya-sutskever-perspective', '伊利亚·苏茨克维', 'Ilya Sutskever'],
      ['mrbeast-perspective', 'MrBeast', 'MrBeast'],
      ['munger-perspective', '查理·芒格', 'Charlie Munger'],
      ['naval-perspective', '纳瓦尔', 'Naval Ravikant'],
      ['paul-graham-perspective', '保罗·格雷厄姆', 'Paul Graham'],
      ['steve-jobs-perspective', '史蒂夫·乔布斯', 'Steve Jobs'],
      ['sun-yuchen-perspective', '孙宇晨', 'Justin Sun'],
      ['taleb-perspective', '纳西姆·塔勒布', 'Nassim Taleb'],
      ['trump-perspective', '唐纳德·特朗普', 'Donald Trump'],
      ['zhang-yiming-perspective', '张一鸣', 'Zhang Yiming'],
      ['zhangxuefeng-perspective', '张雪峰', 'Zhang Xuefeng'],
    ] as const
    const persona = (name: string): GraphNode => ({
      id: `persona:${name}`, kind: 'persona', title: name, content: '', metadata: {}, createdAt: 1, updatedAt: 1,
    })
    const nodes = [...names.map(([name]) => persona(name)), persona('unknown-perspective'), persona('constructor')]
    for (const zh of [true, false]) {
      const results = workflowSkills(nodes, zh)
      expect(results.map(skill => skill.name)).toEqual(nodes.map(node => node.title))
      expect(results.slice(0, 14).map(skill => skill.title)).toEqual(names.map(row => row[zh ? 1 : 2]))
      expect(results.slice(14).map(skill => skill.title)).toEqual(['unknown-perspective', 'constructor'])
    }
  })
})
