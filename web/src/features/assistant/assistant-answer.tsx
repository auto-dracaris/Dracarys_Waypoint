import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { readableCitations, type ChatSource } from './api'

export function AssistantAnswer({ text, sources = [] }: { text: string; sources?: ChatSource[] }) {
  return <div className="assistant-answer assistant-markdown type-text-sm-regular">
    <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml
      urlTransform={(url) => /^https?:\/\//i.test(url) ? url : ''}
      components={{
        a: ({ href, children }) => href
          ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
          : <span>{children}</span>,
        img: ({ alt }) => <span>{alt}</span>,
        table: ({ children }) => <div className="assistant-table-scroll"><table>{children}</table></div>,
      }}>
      {readableCitations(text, sources)}
    </ReactMarkdown>
  </div>
}
