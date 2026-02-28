import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { User, Sparkles, Copy, Check, Zap } from 'lucide-react';
import { useState } from 'react';
import { type Message, formatDuration } from '@/lib/api';

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
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className={`group flex w-full py-4 ${isUser ? 'justify-end' : 'justify-start'}`}
        >
            <div className={`flex gap-4 w-full md:max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className="shrink-0 mt-1 z-10">
                    {isUser ? (
                        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(20,20,26,0.8)] border border-[rgba(255,255,255,0.08)] shadow-md relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(255,255,255,0.05)] to-transparent" />
                            <User size={16} className="text-[#a1a1aa] relative z-10" />
                        </div>
                    ) : (
                        <div className="relative group/avatar">
                            <div className="absolute inset-0 bg-gradient-to-tr from-[#8a2be2] to-[#00f0ff] rounded-xl blur-[6px] opacity-40 group-hover/avatar:opacity-70 transition-opacity duration-300" />
                            <div className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-[#0a0a0c] border border-[rgba(255,255,255,0.15)] shadow-xl overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-tr from-[#8a2be2]/10 to-[#00f0ff]/10" />
                                <Sparkles size={16} className="text-white relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Content Container */}
                <div className={`flex flex-col min-w-0 max-w-full ${isUser ? 'items-end' : 'items-start'}`}>
                    {/* Meta Data */}
                    <div className={`flex items-center gap-2 mb-2 ${isUser ? 'mr-1' : 'ml-1'}`}>
                        <span className="text-[13px] font-semibold text-[#a1a1aa]">
                            {isUser ? 'You' : <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8a2be2] to-[#00f0ff]">Zee-AI</span>}
                        </span>
                        {!isUser && message.model && (
                            <span className="text-[11px] text-[#52525b] font-medium bg-[rgba(255,255,255,0.03)] px-1.5 py-0.5 rounded-md border border-[rgba(255,255,255,0.02)]">
                                {message.model}
                            </span>
                        )}
                        {!isUser && message.duration && message.duration > 0 && (
                            <span className="text-[11px] text-[#71717a] font-mono">
                                {formatDuration(message.duration)}
                            </span>
                        )}
                        {!isUser && message.tokens_used && message.tokens_used > 0 && (
                            <span className="text-[11px] text-[#71717a] flex items-center gap-1">
                                <Zap size={10} className="text-[#00f0ff]/70" /> {message.tokens_used} <span className="text-[#52525b]">tokens</span>
                            </span>
                        )}
                    </div>

                    {/* Chat Bubble Base */}
                    <div
                        className={`relative max-w-full group-hover:shadow-lg transition-shadow duration-300 ${isUser
                            ? 'bg-gradient-to-br from-[rgba(30,30,38,0.9)] to-[rgba(20,20,24,0.9)] text-[#f8f8f8] px-5 py-3.5 rounded-2xl rounded-tr-sm border border-[rgba(255,255,255,0.06)] shadow-md backdrop-blur-xl'
                            : 'text-[#f8f8f8] ml-1'
                            }`}
                    >
                        {isUser && (
                            <div className="absolute inset-0 bg-noise opacity-[0.015] pointer-events-none rounded-2xl rounded-tr-sm" />
                        )}

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
                            <div className="flex items-center gap-1.5 py-2 px-1">
                                <motion.span
                                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }}
                                    transition={{ repeat: Infinity, duration: 1.2, delay: 0 }}
                                    className="w-2 h-2 rounded-full bg-[#8a2be2]"
                                />
                                <motion.span
                                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }}
                                    transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
                                    className="w-2 h-2 rounded-full bg-gradient-to-r from-[#8a2be2] to-[#00f0ff]"
                                />
                                <motion.span
                                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }}
                                    transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
                                    className="w-2 h-2 rounded-full bg-[#00f0ff]"
                                />
                            </div>
                        )}
                    </div>

                    {/* Action Bar Beneath Message */}
                    {!isUser && message.content && !isStreaming && (
                        <div className="mt-2.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2">
                            <button
                                onClick={copyContent}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#71717a] hover:text-white hover:bg-[rgba(255,255,255,0.06)] border border-transparent hover:border-[rgba(255,255,255,0.08)] transition-all"
                            >
                                {copied ? (
                                    <>
                                        <Check size={12} className="text-[#10b981]" />
                                        <span className="text-[#10b981]">Copied to memory</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={12} />
                                        <span>Copy content</span>
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
