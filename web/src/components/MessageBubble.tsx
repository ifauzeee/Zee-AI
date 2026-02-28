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
            className={`group flex w-full px-4 py-5 ${isUser ? 'justify-end' : 'justify-start'}`}
        >
            <div className={`flex gap-3 w-full md:max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className="shrink-0 mt-0.5">
                    {isUser ? (
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-(--color-bg-tertiary) border border-border-primary shadow-sm"
                        >
                            <User size={14} className="text-(--color-text-secondary)" />
                        </div>
                    ) : (
                        <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center bg-(--color-text-primary) shadow-sm"
                        >
                            <Sparkles size={16} className="text-(--color-bg-primary)" />
                        </div>
                    )}
                </div>

                {/* Content Container */}
                <div className={`flex flex-col min-w-0 max-w-full ${isUser ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-2 mb-1.5 ${isUser ? 'mr-1' : 'ml-1'}`}>
                        <span className="text-xs font-semibold text-(--color-text-secondary)">
                            {isUser ? 'You' : 'Zee-AI'}
                        </span>
                        {!isUser && message.model && (
                            <span className="text-xs text-text-muted">
                                · {message.model}
                            </span>
                        )}
                        {!isUser && message.duration && message.duration > 0 && (
                            <span className="text-xs text-text-muted">
                                · {formatDuration(message.duration)}
                            </span>
                        )}
                        {!isUser && message.tokens_used && message.tokens_used > 0 && (
                            <span className="text-xs text-text-muted">
                                · {message.tokens_used} tokens
                            </span>
                        )}
                    </div>

                    <div
                        className={`relative max-w-full ${isUser
                                ? 'bg-(--color-bg-secondary) text-(--color-text-primary) px-4 py-2.5 rounded-2xl rounded-tr-sm border border-border-primary shadow-sm'
                                : 'text-(--color-text-primary) ml-1'
                            }`}
                    >
                        <div className={`markdown-content overflow-x-auto text-[15px] leading-relaxed ${isUser ? 'whitespace-pre-wrap' : ''}`}>
                            {isUser ? (
                                message.content
                            ) : (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {message.content}
                                </ReactMarkdown>
                            )}
                        </div>

                        {isStreaming && !message.content && (
                            <div className="flex items-center gap-1.5 py-2">
                                <motion.span
                                    animate={{ opacity: [0.4, 1, 0.4] }}
                                    transition={{ repeat: Infinity, duration: 1.4, delay: 0 }}
                                    className="w-2 h-2 rounded-full bg-(--color-accent-secondary)"
                                />
                                <motion.span
                                    animate={{ opacity: [0.4, 1, 0.4] }}
                                    transition={{ repeat: Infinity, duration: 1.4, delay: 0.2 }}
                                    className="w-2 h-2 rounded-full bg-(--color-accent-secondary)"
                                />
                                <motion.span
                                    animate={{ opacity: [0.4, 1, 0.4] }}
                                    transition={{ repeat: Infinity, duration: 1.4, delay: 0.4 }}
                                    className="w-2 h-2 rounded-full bg-(--color-accent-secondary)"
                                />
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    {!isUser && message.content && !isStreaming && (
                        <div className="mt-2 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={copyContent}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-text-muted hover:text-(--color-text-secondary) hover:bg-(--color-bg-hover) transition-colors"
                            >
                                {copied ? (
                                    <>
                                        <Check size={12} className="text-success" />
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
            </div>
        </motion.div>
    );
}
