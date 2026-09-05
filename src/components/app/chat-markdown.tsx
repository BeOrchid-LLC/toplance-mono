import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const CHAT_MARKDOWN_ELEMENTS = [
  "a",
  "blockquote",
  "br",
  "code",
  "del",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "hr",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
] as const;

/**
 * The single renderer for model-authored chat text.
 *
 * Raw HTML and images are intentionally excluded. React Markdown's default URL
 * transform also rejects unsafe protocols, so generated links cannot become a
 * script URL. User-authored messages remain plain text in the parent bubble.
 */
export function ChatMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      allowedElements={CHAT_MARKDOWN_ELEMENTS}
      remarkPlugins={[remarkGfm]}
      skipHtml
      components={{
        a: ({ href, children: linkChildren }) => {
          const external = href?.startsWith("http://") || href?.startsWith("https://");

          return (
            <a
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer nofollow" : undefined}
              className="font-semibold text-brand-text underline decoration-current/35 underline-offset-4 hover:decoration-current"
            >
              {linkChildren}
            </a>
          );
        },
        blockquote: ({ children: quoteChildren }) => (
          <blockquote className="mt-3 border-s-2 border-brand ps-4 text-ink-2">
            {quoteChildren}
          </blockquote>
        ),
        code: ({ children: codeChildren }) => (
          <code className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-base">
            {codeChildren}
          </code>
        ),
        h1: ({ children: headingChildren }) => (
          <h1 className="mt-4 text-lg font-bold leading-7 first:mt-0">{headingChildren}</h1>
        ),
        h2: ({ children: headingChildren }) => (
          <h2 className="mt-4 text-lg font-bold leading-7 first:mt-0">{headingChildren}</h2>
        ),
        h3: ({ children: headingChildren }) => (
          <h3 className="mt-4 text-base font-bold leading-7 first:mt-0">{headingChildren}</h3>
        ),
        h4: ({ children: headingChildren }) => (
          <h4 className="mt-4 text-base font-semibold leading-7 first:mt-0">
            {headingChildren}
          </h4>
        ),
        hr: () => <hr className="my-4 border-border" />,
        ol: ({ children: listChildren }) => (
          <ol className="mt-3 list-decimal space-y-1 pl-6 first:mt-0">{listChildren}</ol>
        ),
        p: ({ children: paragraphChildren }) => (
          <p className="leading-7 [&:not(:first-child)]:mt-3">{paragraphChildren}</p>
        ),
        pre: ({ children: preChildren }) => (
          <pre className="mt-3 max-w-full overflow-x-auto rounded-md bg-surface-2 p-3 font-mono text-base leading-7 first:mt-0 [&_code]:bg-transparent [&_code]:p-0">
            {preChildren}
          </pre>
        ),
        table: ({ children: tableChildren }) => (
          <div className="mt-3 max-w-full overflow-x-auto rounded-md border border-border first:mt-0">
            <table className="w-full border-collapse text-start text-base">
              {tableChildren}
            </table>
          </div>
        ),
        td: ({ children: cellChildren }) => (
          <td className="border-t border-border px-3 py-2 align-top">{cellChildren}</td>
        ),
        th: ({ children: cellChildren }) => (
          <th className="bg-surface-2 px-3 py-2 align-top font-semibold">{cellChildren}</th>
        ),
        ul: ({ children: listChildren }) => (
          <ul className="mt-3 list-disc space-y-1 pl-6 first:mt-0">{listChildren}</ul>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
