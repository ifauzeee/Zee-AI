'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send,
    StopCircle,
    Sparkles,
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
            inputRef.current.style.height = '52px';
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
        el.style.height = '52px';
        el.style.height = Math.min(el.scrollHeight, 250) + 'px';
    }

    const suggestions = [
        { icon: <Code size={18} className="text-[#00f0ff]" />, text: 'Write a Python script', desc: 'to scrape a website' },
        { icon: <BrainCircuit size={18} className="text-[#8a2be2]" />, text: 'Explain a concept', desc: 'like a 5 year old' },
        { icon: <BookOpen size={18} className="text-[#10b981]" />, text: 'Summarize this article', desc: 'in bullet points' },
        { icon: <MessageSquare size={18} className="text-[#f59e0b]" />, text: 'Help me draft', desc: 'a professional email' },
    ];

    return (
        <div
            className="flex flex-col h-screen transition-all duration-500 ease-in-out relative z-0"
            style={{ marginLeft: sidebarOpen ? '280px' : '0' }}
        >
            {/* Ambient Background for Welcome Screen */}
            {messages.length === 0 && !streamingContent && (
                <div className="absolute inset-0 z-[-1] overflow-hidden opacity-50 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#8a2be2] rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-float" />
                    <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#00f0ff] rounded-full mix-blend-screen filter blur-[150px] opacity-10 animate-float" style={{ animationDelay: '-3s' }} />
                    <div className="absolute inset-0 bg-grid-pattern opacity-50" />
                </div>
            )}

            {/* Messages Area */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto scroll-smooth py-6"
            >
                {messages.length === 0 && !streamingContent ? (
                    /* Premium Welcome Screen */
                    <div className="flex items-center justify-center min-h-full px-4">
                        <div className="max-w-3xl w-full text-center">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                            >
                                <div className="relative w-20 h-20 mx-auto mb-8 glow-effect">
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#8a2be2] to-[#00f0ff] animate-spin-slow opacity-50 blur-md" />
                                    <div className="relative w-full h-full rounded-2xl bg-[#0a0a0c] border border-[rgba(255,255,255,0.1)] flex items-center justify-center shadow-2xl backdrop-blur-xl">
                                        <Sparkles size={36} className="text-white" />
                                    </div>
                                </div>
                            </motion.div>

                            <motion.h1
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1, duration: 0.8, ease: "easeOut" }}
                                className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight text-white"
                            >
                                Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8a2be2] to-[#00f0ff] animate-pulse">Zee-AI</span>
                            </motion.h1>

                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.8 }}
                                className="text-lg text-[#a1a1aa] mb-12 max-w-xl mx-auto font-light"
                            >
                                Your premium self-hosted AI orchestrator. Completely private, blazingly fast, and elegantly designed.
                            </motion.p>

                            {selectedModel && (
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="max-w-2xl mx-auto mb-10 glass-card p-5 text-left"
                                >
                                    <div className="flex items-center gap-2.5 mb-4">
                                        <div className="p-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.05)]">
                                            <Settings2 size={16} className="text-[#a1a1aa]" />
                                        </div>
                                        <h3 className="text-[15px] font-semibold text-[#f8f8f8] tracking-wide">AI Persona Configuration</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <select
                                                className="w-full bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-[#f8f8f8] outline-none focus:border-[#8a2be2] focus:ring-1 focus:ring-[#8a2be2] transition-all cursor-pointer premium-select appearance-none"
                                                onChange={(e) => setSystemPrompt(e.target.value)}
                                                value={systemPrompt}
                                            >
                                                <option value="">Default Intelligence (Unrestricted)</option>
                                                <option value="You are an expert Golang developer. Provide clean, idiomatic, and efficient code. Explain your logic briefly.">Golang Expert Engineer</option>
                                                <option value="You are a professional translator. Translate the given text accurately with natural phrasing, maintaining the original tone.">Elite Translator</option>
                                                <option value="You are a professional technical writer. Help me rewrite my content to be clear, concise, and engaging for a technical audience.">Technical Architect Writer</option>
                                                <option value="You are a patient and creative teacher. Explain concepts as if I am a 5-year-old, using simple analogies and avoiding jargon.">Socratic Teacher (ELI5)</option>
                                            </select>
                                        </div>
                                        <textarea
                                            className="w-full bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-[#a1a1aa] resize-none outline-none focus:border-[#8a2be2] focus:ring-1 focus:ring-[#8a2be2] transition-all placeholder:text-[#52525b] custom-scrollbar"
                                            rows={2}
                                            placeholder="Or forge a custom imperative instruction here..."
                                            value={systemPrompt}
                                            onChange={(e) => setSystemPrompt(e.target.value)}
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {selectedModel ? (
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto"
                                >
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                setInput(`${s.text} ${s.desc}`);
                                                inputRef.current?.focus();
                                            }}
                                            className="glass-card p-5 text-left group cursor-pointer hover:bg-[rgba(255,255,255,0.02)]"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="p-2.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] shadow-inner transition-transform group-hover:scale-110 duration-300">
                                                    {s.icon}
                                                </div>
                                                <div>
                                                    <div className="text-[15px] font-semibold text-[#f8f8f8] mb-1 group-hover:text-white transition-colors">
                                                        {s.text}
                                                    </div>
                                                    <div className="text-[13px] text-[#71717a] font-medium">
                                                        {s.desc}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="glass-card p-8 max-w-md mx-auto text-center border-[#f59e0b]/30"
                                >
                                    <div className="w-16 h-16 mx-auto bg-[#f59e0b]/10 rounded-full flex items-center justify-center mb-4">
                                        <Cpu size={28} className="text-[#f59e0b]" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">
                                        Awaiting Intelligence Provider
                                    </h3>
                                    <p className="text-sm text-[#a1a1aa] mb-6 leading-relaxed">
                                        Ensure your local Ollama instance is operational and a model is acquired within the framework.
                                    </p>
                                    <div className="bg-black/50 border border-[rgba(255,255,255,0.05)] px-4 py-3 rounded-xl flex items-center justify-between group">
                                        <code className="text-sm text-[#00f0ff] font-mono">
                                            ollama pull gemma3
                                        </code>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Message List */
                    <div className="max-w-4xl mx-auto w-full px-4 pb-8">
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

                        <div ref={messagesEndRef} className="h-6" />
                    </div>
                )}
            </div>

            {/* Scroll to bottom button */}
            <AnimatePresence>
                {showScrollBtn && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        onClick={scrollToBottom}
                        className="fixed bottom-32 left-1/2 -translate-x-1/2 p-3 rounded-full bg-[rgba(30,30,38,0.8)] backdrop-blur-md border border-[rgba(255,255,255,0.1)] text-white shadow-xl hover:bg-[rgba(40,40,50,0.9)] transition-all z-20 group"
                        style={{ marginLeft: sidebarOpen ? '140px' : '0' }}
                    >
                        <ArrowDown size={18} className="group-hover:translate-y-0.5 transition-transform" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Premium Input Area */}
            <div className="p-4 sm:p-6 w-full relative z-10 before:absolute before:inset-x-0 before:bottom-0 before:h-40 before:bg-gradient-to-t before:from-[#0a0a0c] before:via-[#0a0a0c]/80 before:to-transparent before:-z-10 pointer-events-none">
                <div className="max-w-4xl mx-auto pointer-events-auto">
                    <div className="input-premium relative">
                        <div className="flex items-end gap-3 p-3">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={handleInput}
                                onKeyDown={handleKeyDown}
                                placeholder={
                                    selectedModel
                                        ? "Message Zee-AI... (Shift + Enter for new line)"
                                        : "Initialize a model to begin interaction..."
                                }
                                disabled={!selectedModel}
                                rows={1}
                                className="flex-1 bg-transparent border-none outline-none resize-none text-[15px] px-3 py-3 text-white placeholder:text-[#52525b] disabled:opacity-50 font-medium leading-relaxed custom-scrollbar"
                                style={{ minHeight: '52px', maxHeight: '250px' }}
                            />

                            {isStreaming ? (
                                <button
                                    onClick={handleStop}
                                    className="shrink-0 p-3.5 mb-1 mr-1 rounded-xl bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 hover:bg-[#ef4444]/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all"
                                >
                                    <StopCircle size={20} className="animate-pulse" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || !selectedModel}
                                    className="shrink-0 p-3.5 mb-1 mr-1 rounded-xl transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed group relative overflow-hidden"
                                    style={{
                                        background: input.trim() && selectedModel
                                            ? 'linear-gradient(135deg, #8a2be2, #00f0ff)'
                                            : 'rgba(255,255,255,0.05)',
                                        boxShadow: input.trim() && selectedModel
                                            ? '0 4px 15px rgba(138,43,226,0.3)'
                                            : 'none'
                                    }}
                                >
                                    {input.trim() && selectedModel && (
                                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                    <Send size={20} className={`${input.trim() && selectedModel ? "text-white" : "text-[#71717a]"} relative z-10 ${input.trim() && selectedModel ? "group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" : ""}`} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="text-center mt-3 flex justify-center items-center gap-2">
                        <Sparkles size={12} className="text-[#8a2be2]" />
                        <p className="text-xs font-medium text-[#71717a]">
                            Zee-AI operates autonomously on your hardware. Absolute privacy guaranteed.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

