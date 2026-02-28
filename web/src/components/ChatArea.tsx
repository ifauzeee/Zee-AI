'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send,
    StopCircle,
    Sparkles,
    Zap,
    ArrowDown,
    Cpu,
    MessageSquare,
    BrainCircuit,
    Code,
    BookOpen,
    Settings2,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import {
    streamChat,
    fetchConversation,
    type Message,
    type ChatStreamChunk,
} from '@/lib/api';
import MessageBubble from './MessageBubble';

export default function ChatArea() {
    const {
        activeConversationId,
        setActiveConversationId,
        selectedModel,
        isStreaming,
        setIsStreaming,
        conversations,
        setConversations,
        systemPrompt,
        setSystemPrompt,
    } = useStore();

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [streamingContent, setStreamingContent] = useState('');
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const sidebarOpen = useStore((s) => s.sidebarOpen);

    useEffect(() => {
        if (activeConversationId && !isStreaming) {
            loadConversation(activeConversationId);
        } else if (!activeConversationId) {
            setMessages([]);
        }
    }, [activeConversationId, isStreaming]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingContent]);

    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const handleScroll = () => {
            const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
            setShowScrollBtn(!isNearBottom);
        };
        el.addEventListener('scroll', handleScroll);
        return () => el.removeEventListener('scroll', handleScroll);
    }, []);

    async function loadConversation(id: string) {
        try {
            const data = await fetchConversation(id);
            setMessages(data.messages || []);
        } catch {
            console.error('Failed to load conversation');
        }
    }

    function scrollToBottom() {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    function handleSend() {
        if (!input.trim() || isStreaming || !selectedModel) return;

        const userMessage: Message = {
            id: crypto.randomUUID(),
            conversation_id: activeConversationId || '',
            role: 'user',
            content: input.trim(),
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setStreamingContent('');
        setIsStreaming(true);

        if (inputRef.current) {
            inputRef.current.style.height = '48px';
        }

        const controller = streamChat(
            activeConversationId,
            selectedModel,
            userMessage.content,
            systemPrompt,
            (chunk: ChatStreamChunk) => {
                if (chunk.type === 'init' && chunk.conversation_id) {
                    setActiveConversationId(chunk.conversation_id);
                    setTimeout(() => {
                        import('@/lib/api').then(({ fetchConversations }) =>
                            fetchConversations().then((convos) => setConversations(convos))
                        );
                    }, 500);
                }
                if (chunk.type === 'chunk' && chunk.content) {
                    setStreamingContent((prev) => prev + chunk.content);
                }
                if (chunk.type === 'error') {
                    setStreamingContent(`Error: ${chunk.error}`);
                    setIsStreaming(false);
                }
                if (chunk.done) {
                    setStreamingContent((current) => {
                        const assistantMessage: Message = {
                            id: crypto.randomUUID(),
                            conversation_id: activeConversationId || chunk.conversation_id || '',
                            role: 'assistant',
                            content: current,
                            model: selectedModel,
                            tokens_used: chunk.total_tokens,
                            duration: chunk.duration,
                            created_at: new Date().toISOString(),
                        };
                        setMessages((prev) => [...prev, assistantMessage]);
                        return '';
                    });
                    setIsStreaming(false);

                    setTimeout(() => {
                        import('@/lib/api').then(({ fetchConversations }) =>
                            fetchConversations().then((convos) => setConversations(convos))
                        );
                    }, 2000);
                }
            },
            () => { /* done already handled */ },
            (error: string) => {
                setStreamingContent(`Error: ${error}`);
                setIsStreaming(false);
            },
        );

        abortRef.current = controller;
    }

    function handleStop() {
        abortRef.current?.abort();
        setIsStreaming(false);
        if (streamingContent) {
            const assistantMessage: Message = {
                id: crypto.randomUUID(),
                conversation_id: activeConversationId || '',
                role: 'assistant',
                content: streamingContent + '\n\n*[Response stopped]*',
                model: selectedModel,
                created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setStreamingContent('');
        }
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
        setInput(e.target.value);
        const el = e.target;
        el.style.height = '48px';
        el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }

    const suggestions = [
        { icon: <Code size={16} />, text: 'Write a Python script', desc: 'to scrape a website' },
        { icon: <BrainCircuit size={16} />, text: 'Explain a concept', desc: 'like a 5 year old' },
        { icon: <BookOpen size={16} />, text: 'Summarize this article', desc: 'in bullet points' },
        { icon: <MessageSquare size={16} />, text: 'Help me draft', desc: 'a professional email' },
    ];

    return (
        <div
            className="flex flex-col h-screen transition-all duration-300"
            style={{ marginLeft: sidebarOpen ? '288px' : '0' }}
        >
            {/* Messages Area */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto"
            >
                {messages.length === 0 && !streamingContent ? (
                    /* Welcome Screen */
                    <div className="flex items-center justify-center min-h-full px-4">
                        <div className="max-w-2xl w-full text-center">
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', damping: 15 }}
                            >
                                <div
                                    className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center bg-(--color-text-primary)"
                                >
                                    <Sparkles size={36} className="text-(--color-bg-primary)" />
                                </div>
                            </motion.div>

                            <motion.h1
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="text-3xl font-bold mb-2 gradient-text"
                            >
                                Welcome to Zee-AI
                            </motion.h1>
                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-(--color-text-secondary) mb-8"
                            >
                                Your self-hosted AI assistant. Fast, private, and powerful.
                            </motion.p>

                            {selectedModel && (
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.25 }}
                                    className="max-w-xl mx-auto mb-8 bg-(--color-bg-secondary) border border-border-primary rounded-xl p-4 text-left shadow-sm"
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <Settings2 size={16} className="text-(--color-accent-primary)" />
                                        <h3 className="text-sm font-semibold text-(--color-text-primary)">System Prompt (Persona)</h3>
                                    </div>
                                    <select
                                        className="w-full bg-(--color-bg-primary) border border-border-primary rounded-lg px-3 py-2 text-sm text-(--color-text-primary) mb-3 outline-none focus:border-(--color-accent-primary) transition-colors cursor-pointer"
                                        onChange={(e) => setSystemPrompt(e.target.value)}
                                        value={systemPrompt}
                                    >
                                        <option value="">Default (No System Prompt)</option>
                                        <option value="You are an expert Golang developer. Provide clean, idiomatic, and efficient code. Explain your logic briefly.">Golang Expert (Ahli Golang)</option>
                                        <option value="You are a professional translator. Translate the given text accurately with natural phrasing, maintaining the original tone.">Professional Translator (Penerjemah Bahasa)</option>
                                        <option value="You are a professional technical writer. Help me rewrite my content to be clear, concise, and engaging for a technical audience.">Technical Writer</option>
                                        <option value="You are a patient and creative teacher. Explain concepts as if I am a 5-year-old, using simple analogies and avoiding jargon.">Explain like I'm 5 (ELI5)</option>
                                    </select>
                                    <textarea
                                        className="w-full bg-(--color-bg-primary) border border-border-primary rounded-lg px-3 py-2 text-xs text-(--color-text-secondary) resize-none outline-none focus:border-(--color-accent-primary) transition-colors placeholder:text-text-muted"
                                        rows={2}
                                        placeholder="Or type a custom system prompt here..."
                                        value={systemPrompt}
                                        onChange={(e) => setSystemPrompt(e.target.value)}
                                    />
                                </motion.div>
                            )}

                            {selectedModel ? (
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto"
                                >
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                setInput(`${s.text} ${s.desc}`);
                                                inputRef.current?.focus();
                                            }}
                                            className="glass-card p-4 text-left hover:bg-(--color-bg-hover) transition-all group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2 mb-1.5 text-(--color-accent-secondary)">
                                                {s.icon}
                                            </div>
                                            <div className="text-sm font-medium text-(--color-text-primary)">
                                                {s.text}
                                            </div>
                                            <div className="text-xs text-text-muted">
                                                {s.desc}
                                            </div>
                                        </button>
                                    ))}
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="glass-card p-6 max-w-md mx-auto"
                                >
                                    <Cpu size={24} className="mx-auto mb-3 text-warning" />
                                    <p className="text-sm font-medium text-(--color-text-primary) mb-2">
                                        No AI model selected
                                    </p>
                                    <p className="text-xs text-text-muted mb-3">
                                        Make sure Ollama is running and you have at least one model installed.
                                    </p>
                                    <code className="text-xs text-(--color-accent-secondary) bg-(--color-bg-primary) px-3 py-1.5 rounded-lg">
                                        ollama pull gemma3
                                    </code>
                                </motion.div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Message List */
                    <div className="max-w-3xl mx-auto w-full">
                        {messages.map((msg) => (
                            <MessageBubble key={msg.id} message={msg} />
                        ))}

                        {/* Streaming Message */}
                        {isStreaming && (
                            <MessageBubble
                                message={{
                                    id: 'streaming',
                                    conversation_id: activeConversationId || '',
                                    role: 'assistant',
                                    content: streamingContent,
                                    model: selectedModel,
                                    created_at: new Date().toISOString(),
                                }}
                                isStreaming={true}
                            />
                        )}

                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                )}
            </div>

            {/* Scroll to bottom */}
            <AnimatePresence>
                {showScrollBtn && (
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        onClick={scrollToBottom}
                        className="fixed bottom-28 left-1/2 -translate-x-1/2 p-2 rounded-full glass hover:bg-(--color-bg-hover) transition-colors z-10"
                        style={{ marginLeft: sidebarOpen ? '144px' : '0' }}
                    >
                        <ArrowDown size={18} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Input Area */}
            <div
                className="p-4"
                style={{
                    background:
                        'linear-gradient(to top, var(--color-bg-primary) 60%, transparent)',
                }}
            >
                <div className="max-w-3xl mx-auto">
                    <div
                        className="flex items-end gap-2 rounded-[24px] p-2 transition-all"
                        style={{
                            background: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border-primary)',
                        }}
                    >
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={handleInput}
                            onKeyDown={handleKeyDown}
                            placeholder={
                                selectedModel
                                    ? 'Send a message...'
                                    : 'Select a model from the sidebar first...'
                            }
                            disabled={!selectedModel}
                            rows={1}
                            className="flex-1 bg-transparent border-none outline-none resize-none text-sm px-3 py-3 text-(--color-text-primary) placeholder:text-text-muted disabled:opacity-50"
                            style={{ minHeight: '48px', maxHeight: '200px' }}
                        />

                        {isStreaming ? (
                            <button
                                onClick={handleStop}
                                className="shrink-0 p-2.5 rounded-xl bg-error bg-opacity-20 text-error hover:bg-opacity-30 transition-colors"
                            >
                                <StopCircle size={20} />
                            </button>
                        ) : (
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || !selectedModel}
                                className="shrink-0 p-2.5 rounded-full transition-all disabled:opacity-30"
                                style={{
                                    background:
                                        input.trim() && selectedModel
                                            ? 'var(--color-text-primary)'
                                            : 'var(--color-bg-hover)',
                                }}
                            >
                                <Send size={20} className={input.trim() && selectedModel ? "text-(--color-bg-primary)" : "text-text-muted"} />
                            </button>
                        )}
                    </div>

                    <p className="text-center text-xs text-text-muted mt-2">
                        Zee-AI runs locally on your machine. Your data never leaves your device.
                    </p>
                </div>
            </div>
        </div>
    );
}
