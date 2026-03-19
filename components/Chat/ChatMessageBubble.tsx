"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User } from "lucide-react";

const SERRANO_BLUE = "#003399";

export type MessageRole = "user" | "assistant";

interface ChatMessageBubbleProps {
  role: MessageRole;
  content: string;
  /** If true, shows animated dots (loading state for assistant) */
  loading?: boolean;
}

export function ChatMessageBubble({
  role,
  content,
  loading,
}: ChatMessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={`flex gap-2 w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      {/* Avatar — assistant only, left side */}
      {!isUser && (
        <div
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
          style={{
            background: `${SERRANO_BLUE}14`,
            border: `1.5px solid ${SERRANO_BLUE}22`,
          }}
        >
          <Bot size={14} style={{ color: SERRANO_BLUE }} />
        </div>
      )}

      {/* Bubble */}
      <div
        className={`
          relative max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm
          ${
            isUser
              ? "rounded-tr-sm text-white"
              : "rounded-tl-sm text-gray-800 border border-gray-200 bg-white"
          }
        `}
        style={isUser ? { background: SERRANO_BLUE } : undefined}
      >
        {loading ? (
          /* Loading dots */
          <span className="flex gap-1 items-center py-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </span>
        ) : isUser ? (
          /* User: plain text */
          <p className="whitespace-pre-wrap wrap-break-word">{content}</p>
        ) : (
          /* Assistant: full Markdown rendering */
          <div className="prose-chat">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                /* Headings */
                h1: ({ children }) => (
                  <h1 className="text-base font-bold mt-3 mb-1 text-gray-900 first:mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-sm font-bold mt-2.5 mb-1 text-gray-900 first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-semibold mt-2 mb-0.5 text-gray-800 first:mt-0">
                    {children}
                  </h3>
                ),
                /* Paragraph */
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0 wrap-break-word leading-relaxed">
                    {children}
                  </p>
                ),
                /* Strong / Em */
                strong: ({ children }) => (
                  <strong className="font-semibold text-gray-900">
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-gray-700">{children}</em>
                ),
                /* Lists */
                ul: ({ children }) => (
                  <ul className="mb-2 pl-4 space-y-0.5 list-disc list-outside">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-2 pl-4 space-y-0.5 list-decimal list-outside">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed">{children}</li>
                ),
                /* Horizontal rule */
                hr: () => <hr className="my-2 border-gray-200" />,
                /* Blockquote */
                blockquote: ({ children }) => (
                  <blockquote className="pl-3 border-l-2 border-gray-300 text-gray-600 italic my-2">
                    {children}
                  </blockquote>
                ),
                /* Inline code */
                code: ({ children, className }) => {
                  const isBlock = className?.includes("language-");
                  if (isBlock) {
                    return (
                      <code className="block bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre my-2">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs font-mono">
                      {children}
                    </code>
                  );
                },
                /* Code block wrapper */
                pre: ({ children }) => <>{children}</>,
                /* Table */
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2 rounded-lg border border-gray-200">
                    <table className="w-full text-xs border-collapse">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-gray-50 text-gray-700 font-semibold">
                    {children}
                  </thead>
                ),
                tbody: ({ children }) => (
                  <tbody className="divide-y divide-gray-100">{children}</tbody>
                ),
                tr: ({ children }) => (
                  <tr className="hover:bg-gray-50 transition-colors">
                    {children}
                  </tr>
                ),
                th: ({ children }) => (
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-3 py-2 text-gray-700">{children}</td>
                ),
                /* Links */
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                    style={{ color: SERRANO_BLUE }}
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Avatar — user only, right side */}
      {isUser && (
        <div
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
          style={{
            background: `${SERRANO_BLUE}22`,
            border: `1.5px solid ${SERRANO_BLUE}44`,
          }}
        >
          <User size={14} style={{ color: SERRANO_BLUE }} />
        </div>
      )}
    </div>
  );
}
