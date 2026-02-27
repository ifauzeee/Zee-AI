'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquarePlus,
    Trash2,
    PanelLeftClose,
    PanelLeftOpen,
    Cpu,
    Settings,
    Zap,
    MessagesSquare,
    X,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import {
    fetchConversations,
    fetchModels,
    deleteConversation,
    timeAgo,
} from '@/lib/api';

export default function Sidebar() {
    const {
        conversations,
        setConversations,
        activeConversationId,
        setActiveConversationId,
        sidebarOpen,
        toggleSidebar,
        models,
        setModels,
        selectedModel,
        setSelectedModel,
        isStreaming,
    } = useStore();

    const [showModels, setShowModels] = useState(false);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000);
        return () => clearInterval(interval);
    }, []);

    async function loadData() {
        try {
            const [convos, modelList] = await Promise.all([
                fetchConversations(),
                fetchModels(),
            ]);
            setConversations(convos);
            setModels(modelList);
            if (!selectedModel && modelList.length > 0) {
                setSelectedModel(modelList[0].name);
            }
        } catch {
        }
    }

    function handleNewChat() {
        setActiveConversationId(null);
    }

    async function handleDelete(id: string, e: React.MouseEvent) {
        e.stopPropagation();
        await deleteConversation(id);
        setConversations(conversations.filter((c) => c.id !== id));
        if (activeConversationId === id) {
            setActiveConversationId(null);
        }
    }

    return (
        <>
            {/* Toggle button when closed */}
            {!sidebarOpen && (
                <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={toggleSidebar}
                    className="fixed top-4 left-4 z-50 p-2.5 rounded-xl glass hover:bg-[var(--color-bg-hover)] transition-colors"
                    aria-label="Open sidebar"
                >
                    <PanelLeftOpen size={20} />
                </motion.button>
            )}

            <AnimatePresence>
                {sidebarOpen && (
                    <motion.aside
                        initial={{ x: -300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -300, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed left-0 top-0 bottom-0 w-72 z-40 flex flex-col"
                        style={{
                            background: 'var(--color-bg-secondary)',
                            borderRight: '1px solid var(--color-border-primary)',
                        }}
                    >
                        {/* Header */}
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{
                                        background:
                                            'linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-gradient-to))',
                                    }}
                                >
                                    <Zap size={16} className="text-white" />
                                </div>
                                <span className="font-bold text-lg gradient-text">Zee-AI</span>
                            </div>
                            <button
                                onClick={toggleSidebar}
                                className="p-1.5 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
                                aria-label="Close sidebar"
                            >
                                <PanelLeftClose size={18} className="text-[var(--color-text-tertiary)]" />
                            </button>
                        </div>

                        {/* New Chat Button */}
                        <div className="px-3 mb-2">
                            <button
                                onClick={handleNewChat}
                                disabled={isStreaming}
                                className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5 disabled:opacity-50"
                            >
                                <MessageSquarePlus size={16} />
                                New Chat
                            </button>
                        </div>

                        {/* Model Selector */}
                        <div className="px-3 mb-3">
                            <button
                                onClick={() => setShowModels(!showModels)}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left hover:bg-[var(--color-bg-hover)] transition-colors"
                                style={{ border: '1px solid var(--color-border-primary)' }}
                            >
                                <Cpu size={14} className="text-[var(--color-accent-secondary)] shrink-0" />
                                <span className="truncate flex-1 text-[var(--color-text-secondary)]">
                                    {selectedModel || 'Select model...'}
                                </span>
                            </button>

                            <AnimatePresence>
                                {showModels && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-1 rounded-xl overflow-hidden"
                                        style={{
                                            background: 'var(--color-bg-tertiary)',
                                            border: '1px solid var(--color-border-primary)',
                                        }}
                                    >
                                        {models.length === 0 ? (
                                            <div className="p-3 text-xs text-center text-[var(--color-text-muted)]">
                                                No models found. Run:<br />
                                                <code className="text-[var(--color-accent-secondary)]">ollama pull gemma3</code>
                                            </div>
                                        ) : (
                                            <div className="max-h-48 overflow-y-auto p-1">
                                                {models.map((m) => (
                                                    <button
                                                        key={m.name}
                                                        onClick={() => {
                                                            setSelectedModel(m.name);
                                                            setShowModels(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedModel === m.name
                                                            ? 'bg-[var(--color-accent-primary)] bg-opacity-20 text-[var(--color-accent-secondary)]'
                                                            : 'hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]'
                                                            }`}
                                                    >
                                                        <div className="font-medium truncate">{m.name}</div>
                                                        <div className="text-xs text-[var(--color-text-muted)]">
                                                            {m.details?.parameter_size} · {m.details?.quantization_level}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Conversations List */}
                        <div className="flex-1 overflow-y-auto px-2">
                            <div className="px-2 py-1.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                                <MessagesSquare size={12} className="inline mr-1.5" />
                                Conversations
                            </div>
                            <div className="space-y-0.5">
                                {conversations.map((convo) => (
                                    <motion.button
                                        key={convo.id}
                                        layout
                                        onClick={() => setActiveConversationId(convo.id)}
                                        className={`group w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all relative ${activeConversationId === convo.id
                                            ? 'bg-[var(--color-bg-hover)]'
                                            : 'hover:bg-[var(--color-bg-hover)]'
                                            }`}
                                        style={
                                            activeConversationId === convo.id
                                                ? { borderLeft: '2px solid var(--color-accent-primary)' }
                                                : {}
                                        }
                                    >
                                        <div className="truncate font-medium text-[var(--color-text-primary)] pr-6">
                                            {convo.title}
                                        </div>
                                        <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                            {timeAgo(convo.updated_at)}
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(convo.id, e)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--color-error)] hover:bg-opacity-20 hover:text-[var(--color-error)] transition-all"
                                            aria-label="Delete conversation"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </motion.button>
                                ))}

                                {conversations.length === 0 && (
                                    <div className="text-center py-8 px-4">
                                        <MessagesSquare
                                            size={32}
                                            className="mx-auto mb-3 text-[var(--color-text-muted)]"
                                        />
                                        <p className="text-sm text-[var(--color-text-muted)]">
                                            No conversations yet
                                        </p>
                                        <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                            Start a new chat above
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div
                            className="p-3"
                            style={{ borderTop: '1px solid var(--color-border-primary)' }}
                        >
                            <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                                <div
                                    className={`w-2 h-2 rounded-full ${models.length > 0 ? 'bg-[var(--color-success)]' : 'bg-[var(--color-error)]'
                                        }`}
                                />
                                {models.length > 0
                                    ? `Ollama · ${models.length} model${models.length > 1 ? 's' : ''}`
                                    : 'Ollama disconnected'}
                            </div>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
        </>
    );
}
