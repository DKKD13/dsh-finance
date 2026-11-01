import { describe, expect, it } from 'vitest'
import { protectReportCurrency } from '../../client/report-markdown.ts'

describe('Reports currency protection', () => {
  it('escapes dollar and US-dollar amounts in prose and tables only', () => {
    const input = 'Revenue $102.5 billion and EPS $1.85.\n\n| Scope | Amount |\n| --- | --- |\n| Revenue | US$1,234.50 |'
    expect(protectReportCurrency(input)).toBe('Revenue \\$102.5 billion and EPS \\$1.85.\n\n| Scope | Amount |\n| --- | --- |\n| Revenue | US\\$1,234.50 |')
  })

  it('preserves inline and display math', () => {
    const input = 'Formula $x+1$, arithmetic $1.5 + 2$, and\n\n$$\n1.5 + 2\n$$'
    expect(protectReportCurrency(input)).toBe(input)
  })

  it('preserves already escaped dollars and is idempotent', () => {
    const input = 'Already \\$102.5 billion and US\\$1,234.50; currency $1.85.'
    const once = protectReportCurrency(input)
    expect(once).toBe('Already \\$102.5 billion and US\\$1,234.50; currency \\$1.85.')
    expect(protectReportCurrency(once)).toBe(once)
  })

  it('preserves inline code and fenced code verbatim', () => {
    const input = '`$102.5 billion` and `` US$1,234.50 ``\n\n```text\n$102.5 billion and US$1,234.50\n```\n\n~~~\n$1.85\n~~~'
    expect(protectReportCurrency(input)).toBe(input)
  })

  it('does not confuse prose between two amounts with math', () => {
    const input = '季度收入 $102.5 billion，同比 +8%；摊薄 EPS $1.85，调整后同比 +13%'
    const output = protectReportCurrency(input)
    expect(output).toBe('季度收入 \\$102.5 billion，同比 +8%；摊薄 EPS \\$1.85，调整后同比 +13%')
    expect(output).not.toContain('102.5billion，同比 + 81.85')
  })

  it('handles adjacent amounts, unmatched literal dollars, and mixed protected segments', () => {
    const input = '$100,$200; $value; math $1.5 + 2$; code `$300`; currency US$1,234.50'
    expect(protectReportCurrency(input)).toBe('\\$100,\\$200; \\$value; math $1.5 + 2$; code `$300`; currency US\\$1,234.50')
  })

  it('protects the actual multiline financial statement currency units', () => {
    const input = [
      'CONDENSED CONSOLIDATED STATEMENTS OF OPERATIONS (Unaudited, $ in millions) — three months ended Sep 27, 2025 vs Sep 28, 2024 | twelve months ended Sep 27, 2025 vs Sep 28, 2024:',
      'Products: 73,716 / 69,958 | 307,003 / 294,866',
      'Services: 28,750 / 24,972 | 109,158 / 96,169',
      'Total net sales: 102,466 / 94,930 | 416,161 / 391,035',
      'Total cost of sales: 54,125 / 51,051 | 220,960 / 210,352',
      'Gross margin: 48,341 / 43,879 | 195,201 / 180,683',
      'Research and development: 8,866 / 7,765 | 34,550 / 31,370',
      'Selling, general and administrative: 7,048 / 6,523 | 27,601 / 26,097',
      'Operating income: 32,427 / 29,591 | 133,050 / 123,216',
      'Other income/(expense), net: 377 / 19 | (321) / 269',
      'Income before provision for income taxes: 32,804 / 29,610 | 132,729 / 123,485',
      'Provision for income taxes: 5,338 / 14,874 | 20,719 / 29,749',
      'Net income: 27,466 / 14,736 | 112,010 / 93,736',
      'Diluted earnings per share: $1.85 / $0.97 | $7.46 / $6.08',
      'Diluted shares (thousands): 14,863,609 / 15,242,853 | 15,004,697 / 15,408,095',
    ].join('\n')
    const once = protectReportCurrency(input)

    expect(once).toContain('(Unaudited, \\$ in millions)')
    expect(once).toContain('Diluted earnings per share: \\$1.85 / \\$0.97 | \\$7.46 / \\$6.08')
    expect(once).toBe(input.replace(/\$/g, '\\$'))
    expect(protectReportCurrency(once)).toBe(once)
  })
})
