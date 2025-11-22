import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from './CodeBlock';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="markdown-body text-sm md:text-base leading-relaxed break-words text-gray-200 grid min-w-0">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({node, ...props}) => <a className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
          // Unwrap pre tags to let CodeBlock handle the container
          pre: ({children}) => <>{children}</>,
          code({node, className, children, ...props}) {
            const match = /language-(\w+)/.exec(className || '');
            const codeContent = String(children).replace(/\n$/, '');
            // Heuristic: if it has a language class or multiple lines, treat as block
            const isMultiLine = codeContent.includes('\n');
            
            if (match || isMultiLine) {
              const language = match ? match[1] : 'text';
              return <CodeBlock language={language} code={codeContent} />;
            }
            
            // Inline code style
            return (
              <code className="bg-white/10 px-1.5 py-0.5 rounded text-[0.9em] font-mono text-blue-200 break-all" {...props}>
                {children}
              </code>
            )
          },
          // Custom styling for other elements to ensure consistency
          h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4 text-white" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-5 mb-3 text-white" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-4 mb-2 text-white" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 py-1 my-4 bg-blue-900/20 rounded-r italic text-gray-300" {...props} />,
          table: ({node, ...props}) => <div className="overflow-x-auto my-4 rounded-lg border border-gray-700 max-w-full"><table className="min-w-full divide-y divide-gray-700" {...props} /></div>,
          th: ({node, ...props}) => <th className="px-4 py-3 bg-gray-800 text-left text-xs font-medium text-gray-300 uppercase tracking-wider" {...props} />,
          td: ({node, ...props}) => <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300 border-t border-gray-700" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;