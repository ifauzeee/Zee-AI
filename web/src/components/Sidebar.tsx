'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquarePlus,
    Trash2,
    PanelLeftClose,
    PanelLeftOpen,
    Cpu,
    Zap,
    MessagesSquare,
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
                    className="fixed top-5 left-5 z-50 p-2.5 rounded-xl bg-[rgba(18,18,22,0.65)] hover:bg-[rgba(30,30,38,0.8)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] shadow-lg transition-all text-text-secondary hover:text-white group"
                    aria-label="Open sidebar"
                >
                    <PanelLeftOpen size={20} className="group-hover:scale-110 transition-transform" />
                </motion.button>
            )}

            <AnimatePresence>
                {sidebarOpen && (
                    <motion.aside
                        initial={{ x: -300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -300, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed left-0 top-0 bottom-0 w-[280px] z-40 flex flex-col backdrop-blur-2xl bg-[rgba(10,10,12,0.85)] border-r border-[rgba(255,255,255,0.08)] shadow-[4px_0_24px_rgba(0,0,0,0.5)]"
                    >
                        {/* Header */}
                        <div className="p-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-linear-to-tr from-[#8a2be2] to-[#00f0ff] rounded-xl blur-sm opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                                    <div className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-bg-primary border border-[rgba(255,255,255,0.1)]">
                                        <Zap size={18} className="text-[#00f0ff]" />
                                    </div>
                                </div>
                                <span className="font-extrabold text-xl tracking-tight text-transparent bg-clip-text bg-linear-to-r from-white to-text-secondary">Zee-AI</span>
                            </div>
                            <button
                                onClick={toggleSidebar}
                                className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors text-text-tertiary hover:text-white"
                                aria-label="Close sidebar"
                            >
                                <PanelLeftClose size={18} />
                            </button>
                        </div>

                        {/* New Chat Button */}
                        <div className="px-4 mb-4">
                            <button
                                onClick={handleNewChat}
                                disabled={isStreaming}
                                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-semibold text-[14px] disabled:opacity-50 transition-all duration-300 relative overflow-hidden group border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] text-white"
                            >
                                <div className="absolute inset-0 w-full h-full bg-linear-to-r from-[#8a2be2]/20 to-[#00f0ff]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <MessageSquarePlus size={18} className="relative z-10 text-[#00f0ff]" />
                                <span className="relative z-10">New Interaction</span>
                            </button>
                        </div>

                        {/* Model Selector */}
                        <div className="px-4 mb-6">
                            <button
                                onClick={() => setShowModels(!showModels)}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all duration-300 bg-[rgba(20,20,24,0.6)] border border-[rgba(255,255,255,0.05)] hover:border-border-hover group"
                            >
                                <Cpu size={16} className="text-[#8a2be2] shrink-0 group-hover:animate-pulse" />
                                <span className="truncate flex-1 font-medium text-[#e2e8f0]">
                                    {selectedModel || 'Select Provider...'}
                                </span>
                            </button>

                            <AnimatePresence>
                                {showModels && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, y: -10 }}
                                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                                        exit={{ opacity: 0, height: 0, y: -10 }}
                                        className="mt-2 rounded-xl overflow-hidden bg-[rgba(15,15,18,0.9)] border border-[rgba(255,255,255,0.08)] backdrop-blur-md shadow-xl"
                                    >
                                        {models.length === 0 ? (
                                            <div className="p-4 text-[13px] text-center text-text-secondary leading-relaxed">
                                                No intelligence available.<br />
                                                Run: <code className="text-[#00f0ff] bg-black/30 px-1.5 py-0.5 rounded ml-1">ollama pull gemma3</code>
                                            </div>
                                        ) : (
                                            <div className="max-h-[220px] overflow-y-auto p-1.5 custom-scrollbar">
                                                {models.map((m) => (
                                                    <button
                                                        key={m.name}
                                                        onClick={() => {
                                                            setSelectedModel(m.name);
                                                            setShowModels(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${selectedModel === m.name
                                                            ? 'bg-[rgba(138,43,226,0.15)] text-white'
                                                            : 'hover:bg-bg-hover text-text-secondary hover:text-[#e2e8f0]'
                                                            }`}
                                                    >
                                                        <div className="font-semibold truncate mb-0.5">{m.name}</div>
                                                        <div className="text-[11px] text-text-tertiary font-mono">
                                                            {m.details?.parameter_size} parameters · {m.details?.quantization_level}
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
                        <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
                            <div className="px-3 pb-2 text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] flex items-center">
                                <MessagesSquare size={12} className="mr-2 opacity-70" />
                                Memory Bank
                            </div>
                            <div className="space-y-1">
                                {conversations.map((convo) => (
                                    <motion.div
                                        key={convo.id}
                                        layout
                                        onClick={() => setActiveConversationId(convo.id)}
                                        className={`group w-full text-left px-3 py-3 rounded-xl text-sm transition-all duration-200 cursor-pointer relative overflow-hidden ${activeConversationId === convo.id
                                            ? 'bg-[rgba(255,255,255,0.06)] shadow-inner'
                                            : 'hover:bg-[rgba(255,255,255,0.03)]'
                                            }`}
                                    >
                                        {activeConversationId === convo.id && (
                                            <div className="absolute left-0 top-1/4 bottom-1/4 w-[3px] bg-linear-to-b from-[#8a2be2] to-[#00f0ff] rounded-r-full" />
                                        )}

                                        <div className={`truncate font-medium pr-7 transition-colors ${activeConversationId === convo.id ? 'text-white' : 'text-text-secondary group-hover:text-[#e2e8f0]'}`}>
                                            {convo.title}
                                        </div>
                                        <div className="text-[11px] text-text-muted mt-1 font-medium">
                                            {timeAgo(convo.updated_at)}
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(convo.id, e)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-error/20 text-text-tertiary hover:text-error transition-all"
                                            aria-label="Delete conversation"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </motion.div>
                                ))}

                                {conversations.length === 0 && (
                                    <div className="text-center py-10 px-4">
                                        <div className="w-12 h-12 rounded-full border border-dashed border-text-muted flex items-center justify-center mx-auto mb-3">
                                            <MessagesSquare size={20} className="text-text-muted" />
                                        </div>
                                        <p className="text-[13px] font-medium text-text-tertiary">
                                            Empty Memory Bank
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Status */}
                        <div className="p-4 border-t border-[rgba(255,255,255,0.08)] bg-[rgba(10,10,12,0.95)]">
                            <div className="flex items-center gap-2.5 text-[12px] font-medium text-text-tertiary">
                                <div className="relative flex h-2 w-2">
                                    {models.length > 0 && (
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-40"></span>
                                    )}
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${models.length > 0 ? 'bg-success' : 'bg-error'}`}></span>
                                </div>
                                <span className="tracking-wide">
                                    {models.length > 0
                                        ? `SYS: ONLINE · ${models.length} NODE${models.length > 1 ? 'S' : ''}`
                                        : 'SYS: OFFLINE'}
                                </span>
                            </div>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
        </>
    );
}
