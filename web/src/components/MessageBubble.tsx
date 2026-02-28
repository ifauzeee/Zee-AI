'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { User, Sparkles, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { Message } from '@/lib/api';
import { formatDuration } from '@/lib/api';

interface MessageBubbleProps {
    message: Message;
    isStreaming?: boolean;
}

export default function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
    const [copied, setCopied] = useState(false);
    const isUser = message.role === 'user';

    async function copyContent() {
        await navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`group flex gap-3 px-4 py-5`}
        >
            {/* Avatar */}
            <div className="shrink-0 mt-0.5">
                {isUser ? (
                    <div
                        className="w-8 h-8 rounded-[8px] flex items-center justify-center bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)]"
                    >
                        <User size={16} className="text-[var(--color-text-primary)]" />
                    </div>
                ) : (
                    <div
                        className="w-8 h-8 rounded-[8px] flex items-center justify-center bg-[var(--color-text-primary)]"
                    >
                        <Sparkles size={16} className="text-[var(--color-bg-primary)]" />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                        {isUser ? 'You' : 'Zee-AI'}
                    </span>
                    {message.model && (
                        <span className="text-xs text-[var(--color-text-muted)]">
                            · {message.model}
                        </span>
                    )}
                    {message.duration && message.duration > 0 && (
                        <span className="text-xs text-[var(--color-text-muted)]">
                            · {formatDuration(message.duration)}
                        </span>
                    )}
                    {message.tokens_used && message.tokens_used > 0 && (
                        <span className="text-xs text-[var(--color-text-muted)]">
                            · {message.tokens_used} tokens
                        </span>
                    )}
                </div>

                <div className="markdown-content text-[var(--color-text-primary)]">
                    {isUser ? (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                        </ReactMarkdown>
                    )}

                    {isStreaming && !message.content && (
                        <div className="flex items-center gap-1.5 py-2">
                            <span className="typing-dot w-2 h-2 rounded-full bg-[var(--color-accent-secondary)]" />
                            <span className="typing-dot w-2 h-2 rounded-full bg-[var(--color-accent-secondary)]" />
                            <span className="typing-dot w-2 h-2 rounded-full bg-[var(--color-accent-secondary)]" />
                        </div>
                    )}
                </div>

                {/* Actions */}
                {!isUser && message.content && !isStreaming && (
                    <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={copyContent}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
                        >
                            {copied ? (
                                <>
                                    <Check size={12} className="text-[var(--color-success)]" />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <Copy size={12} />
                                    Copy
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
