import { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';

const ANGEL_LOGO = '/angel-ai-logo-36.webp';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AngelMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export const AngelMessage = memo(({ message, isStreaming = false }: AngelMessageProps) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <Avatar className={`w-8 h-8 flex-shrink-0 ${!isUser ? 'border border-amber-500/30' : ''}`}>
        {isUser ? (
          <>
            <AvatarFallback className="bg-primary/20">
              <User className="w-4 h-4 text-primary" />
            </AvatarFallback>
          </>
        ) : (
          <>
            <AvatarImage src={ANGEL_LOGO} alt="ANGEL AI" />
            <AvatarFallback className="bg-amber-500/20 text-amber-500">✨</AvatarFallback>
          </>
        )}
      </Avatar>

      {/* Message Bubble */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-muted/50 border border-amber-500/20 rounded-tl-sm'
        }`}
      >
        {/* Message Content with simple markdown-like rendering */}
        <div className="text-sm whitespace-pre-wrap break-words">
          {message.content.split('\n').map((line, i) => (
            <span key={i}>
              {line.startsWith('**') && line.endsWith('**') ? (
                <strong>{line.slice(2, -2)}</strong>
              ) : line.startsWith('*') && line.endsWith('*') ? (
                <em>{line.slice(1, -1)}</em>
              ) : line.startsWith('# ') ? (
                <span className="text-base font-bold block mt-2 mb-1">{line.slice(2)}</span>
              ) : line.startsWith('## ') ? (
                <span className="text-sm font-bold block mt-1.5">{line.slice(3)}</span>
              ) : line.startsWith('- ') || line.startsWith('• ') ? (
                <span className="block pl-2">• {line.slice(2)}</span>
              ) : (
                line
              )}
              {i < message.content.split('\n').length - 1 && <br />}
            </span>
          ))}
          
          {/* Streaming cursor */}
          {isStreaming && !isUser && (
            <span className="inline-block w-1.5 h-4 bg-amber-500 animate-pulse ml-0.5 align-middle" />
          )}
        </div>
      </div>
    </div>
  );
});

AngelMessage.displayName = 'AngelMessage';
