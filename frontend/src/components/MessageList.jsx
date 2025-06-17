import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Helper component for code blocks
const CodeBlock = ({ language, children }) => {
  return (
    <div className="relative rounded-md overflow-hidden my-4">
      <div className="flex justify-between items-center bg-secondary-800 text-secondary-200 px-4 py-1 text-xs font-mono">
        <span>{language || 'code'}</span>
        <button
          onClick={() => navigator.clipboard.writeText(children)}
          className="text-secondary-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
          </svg>
        </button>
      </div>
      <SyntaxHighlighter 
        language={language || 'text'} 
        style={atomDark}
        customStyle={{ margin: 0, borderRadius: 0 }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
};

const MessageList = ({ messages }) => {
  const endRef = useRef(null);
  
  useEffect(() => {
    // Scroll to bottom when messages change
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-secondary-500">
        <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
        </svg>
        <p>No messages yet. Start a conversation!</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col space-y-4 overflow-y-auto p-4">
      {messages.map((message, index) => (
        <div 
          key={message.id || index}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div 
            className={`max-w-[80%] rounded-lg px-4 py-2 ${
              message.role === 'user' 
                ? 'bg-primary-600 text-white rounded-br-none' 
                : 'bg-secondary-100 text-secondary-900 rounded-bl-none'
            }`}
          >
            {message.image_url && (
              <div className="mb-2">
                <img 
                  src={message.image_url} 
                  alt="Uploaded"
                  className="max-h-64 rounded-md"
                />
              </div>
            )}
            
            {message.role === 'user' ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <CodeBlock language={match[1]}>
                          {String(children).replace(/\n$/, '')}
                        </CodeBlock>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
            
            {message.timestamp && (
              <div className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-primary-200' : 'text-secondary-500'
              }`}>
                {new Date(message.timestamp?.toDate?.() || message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
};

export default MessageList;