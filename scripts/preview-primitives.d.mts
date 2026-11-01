import type * as React from 'react'
import type { MarkdownLabels } from '@deepseek-ai/dsh-client-ui-primitives'

export function createPreviewPrimitives(React: typeof React): {
  MarkdownText: React.ComponentType<{
    readonly text: string
    readonly labels?: MarkdownLabels
    readonly omitHtml?: boolean
    readonly variant?: 'body' | 'compact'
  }>
}
