import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

interface MarkdownContentProps {
  children: string
  className?: string
}

/**
 * Renders a markdown string as formatted HTML.
 * Wraps @tailwindcss/typography's `prose` classes so all entity detail pages
 * get consistent markdown rendering without per-page styling.
 */
export function MarkdownContent({ children, className }: MarkdownContentProps) {
  return (
    <div className={cn('prose prose-sm max-w-none', className)}>
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  )
}
