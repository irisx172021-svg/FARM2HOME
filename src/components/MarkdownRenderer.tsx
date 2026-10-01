import React from 'react';
import Markdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';

export interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Sanitizes and cleans AI output prior to rendering.
 * - Extracts inner text/answer if raw JSON was returned.
 * - Strips any raw SVG tags or SVG code blocks.
 * - Strips any leaked metadata JSON code blocks.
 * - Disallows execution of dangerous HTML tags.
 */
export function sanitizeAiMarkdown(rawText: string): string {
  if (!rawText) return '';
  let text = rawText.trim();

  // 1. If entire text is JSON wrapped in markdown code fence (```json ... ```)
  const jsonFenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (jsonFenceMatch) {
    try {
      const parsed = JSON.parse(jsonFenceMatch[1].trim());
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.answer === 'string') text = parsed.answer.trim();
        else if (typeof parsed.text === 'string') text = parsed.text.trim();
        else if (typeof parsed.message === 'string') text = parsed.message.trim();
      }
    } catch {
      // not valid json, retain text
    }
  }

  // 2. If entire text is a raw JSON object string
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.answer === 'string') text = parsed.answer.trim();
        else if (typeof parsed.text === 'string') text = parsed.text.trim();
        else if (typeof parsed.message === 'string') text = parsed.message.trim();
      }
    } catch {
      // not valid json, retain text
    }
  }

  // 3. Remove raw SVG elements or tags (<svg ...>...</svg> or <svg ... />)
  text = text.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, '');
  text = text.replace(/<svg\b[^>]*\/>/gi, '');

  // 4. Remove any code fences that contain pure SVG
  text = text.replace(/```(?:svg|xml|html)?\s*<svg\b[\s\S]*?<\/svg>\s*```/gi, '');

  // 5. Remove any leaked metadata JSON code blocks like ```json { "category": ... } ```
  text = text.replace(
    /```(?:json)?\s*\{[\s\S]*?"(?:category|confidence|needs_more_information|follow_up_questions)"[\s\S]*?\}\s*```/gi,
    ''
  );

  // 6. Strip dangerous executable HTML tags
  text = text.replace(/<\/?(script|iframe|style|object|embed)[^>]*>/gi, '');

  return text.trim();
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const cleaned = sanitizeAiMarkdown(content);

  return (
    <div className={`markdown-content text-xs leading-relaxed break-words text-zinc-100 ${className}`}>
      <Markdown
        remarkPlugins={[remarkBreaks]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-sm font-bold text-white mt-3 mb-1.5 pb-1 border-b border-white/[0.08]">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xs font-bold text-emerald-300 mt-2.5 mb-1">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold text-emerald-400 mt-2 mb-0.5">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs font-semibold text-zinc-200 mt-1.5 mb-0.5">{children}</h4>
          ),
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
          b: ({ children }) => <b className="font-bold text-white">{children}</b>,
          em: ({ children }) => <em className="italic text-zinc-300">{children}</em>,
          ul: ({ children }) => (
            <ul className="list-disc pl-4 space-y-1 my-2 text-zinc-100 marker:text-emerald-400">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 space-y-1 my-2 text-zinc-100 marker:text-emerald-400 font-normal">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed pl-0.5">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-emerald-500/50 pl-2.5 my-2 italic text-zinc-300 bg-white/[0.02] py-1 rounded-r">
              {children}
            </blockquote>
          ),
          code: ({ node, className: codeClassName, children, ...rest }) => {
            const isCodeBlock = Boolean(codeClassName && codeClassName.includes('language-'));
            if (isCodeBlock) {
              return (
                <code className="text-emerald-300 font-mono text-[11px]">
                  {children}
                </code>
              );
            }
            return (
              <code
                className="px-1.5 py-0.5 rounded bg-white/[0.08] text-emerald-300 font-mono text-[11px] border border-white/[0.06]"
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="p-2.5 rounded-lg bg-black/60 border border-white/[0.08] font-mono text-[11px] overflow-x-auto my-2 text-emerald-300">
              {children}
            </pre>
          ),
          hr: () => <hr className="border-white/[0.08] my-2" />,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
            >
              {children}
            </a>
          ),
        }}
      >
        {cleaned}
      </Markdown>
    </div>
  );
};
