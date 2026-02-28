import { create } from 'zustand';
import type { Conversation, Model } from '@/lib/api';

interface AppState {
    models: Model[];
    selectedModel: string;
    setModels: (models: Model[]) => void;
    setSelectedModel: (model: string) => void;

    systemPrompt: string;
    setSystemPrompt: (prompt: string) => void;

    conversations: Conversation[];
    activeConversationId: string | null;
    setConversations: (conversations: Conversation[]) => void;
    setActiveConversationId: (id: string | null) => void;
    addConversation: (conversation: Conversation) => void;
    removeConversation: (id: string) => void;

    sidebarOpen: boolean;
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;

    isStreaming: boolean;
    setIsStreaming: (streaming: boolean) => void;

}

export const useStore = create<AppState>((set) => ({
    models: [],
    selectedModel: '',
    setModels: (models) => set({ models }),
    setSelectedModel: (model) => set({ selectedModel: model }),

    systemPrompt: '',
    setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),

    conversations: [],
    activeConversationId: null,
    setConversations: (conversations) => set({ conversations }),
    setActiveConversationId: (id) => set({ activeConversationId: id }),
    addConversation: (conversation) =>
        set((state) => ({ conversations: [conversation, ...state.conversations] })),
    removeConversation: (id) =>
        set((state) => ({
            conversations: state.conversations.filter((c) => c.id !== id),
            activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
        })),

    sidebarOpen: true,
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    isStreaming: false,
    setIsStreaming: (streaming) => set({ isStreaming: streaming }),

}));
