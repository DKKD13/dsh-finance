declare module '@deepseek-ai/dsh-client-ui-primitives' {
  import type { ComponentType } from 'react'

  export interface MarkdownLabels {
    readonly code: {
      readonly copyLabel: string
      readonly copiedLabel: string
      readonly toolbarLabels: {
        readonly codeLabel: string
        readonly wrapLabel: string
        readonly unwrapLabel: string
      }
    }
    readonly footnotes: string
  }

  export const MarkdownText: ComponentType<{
    readonly text: string
    readonly labels: MarkdownLabels
    readonly omitHtml?: boolean
    readonly variant?: 'body' | 'compact'
  }>
}
