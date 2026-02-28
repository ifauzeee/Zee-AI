export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface Conversation {
    id: string;
    title: string;
    model: string;
    created_at: string;
    updated_at: string;
}

export interface Message {
    id: string;
    conversation_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    model?: string;
    tokens_used?: number;
    duration?: number;
    created_at: string;
}

export interface Model {
    name: string;
    model: string;
    modified_at: string;
    size: number;
    digest: string;
    details: {
        parent_model: string;
        format: string;
        family: string;
        families: string[];
        parameter_size: string;
        quantization_level: string;
    };
}

export interface ChatStreamChunk {
    type: 'init' | 'chunk' | 'error';
    content?: string;
    conversation_id?: string;
    done?: boolean;
    total_tokens?: number;
    eval_count?: number;
    duration?: number;
    error?: string;
}

export async function fetchModels(): Promise<Model[]> {
    const res = await fetch(`${API_BASE}/api/models`);
    if (!res.ok) throw new Error('Failed to fetch models');
    const data = await res.json();
    return data.models || [];
}

export async function fetchConversations(): Promise<Conversation[]> {
    const res = await fetch(`${API_BASE}/api/conversations`);
    if (!res.ok) throw new Error('Failed to fetch conversations');
    const data = await res.json();
    return data.conversations || [];
}

export async function createConversation(model: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
    });
    if (!res.ok) throw new Error('Failed to create conversation');
    return res.json();
}

export async function fetchConversation(id: string): Promise<{ conversation: Conversation; messages: Message[] }> {
    const res = await fetch(`${API_BASE}/api/conversations/${id}`);
    if (!res.ok) throw new Error('Failed to fetch conversation');
    return res.json();
}

export async function deleteConversation(id: string): Promise<void> {
    await fetch(`${API_BASE}/api/conversations/${id}`, { method: 'DELETE' });
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
    await fetch(`${API_BASE}/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
    });
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
    const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/messages`);
    if (!res.ok) throw new Error('Failed to fetch messages');
    const data = await res.json();
    return data.messages || [];
}

export async function fetchStats(): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE}/api/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
}

export async function deleteModel(name: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/models/${encodeURIComponent(name)}`, { method: 'DELETE' });
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete model');
    }
}

export function streamChat(
    conversationId: string | null,
    model: string,
    message: string,
    systemPrompt: string | undefined,
    onChunk: (chunk: ChatStreamChunk) => void,
    onDone: () => void,
    onError: (error: string) => void,
): AbortController {
    const controller = new AbortController();

    fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            conversation_id: conversationId,
            model,
            message,
            system_prompt: systemPrompt,
        }),
        signal: controller.signal,
    })
        .then(async (res) => {
            if (!res.ok) {
                const data = await res.json();
                onError(data.error || 'Chat request failed');
                return;
            }

            const reader = res.body?.getReader();
            if (!reader) {
                onError('No response stream');
                return;
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const chunk: ChatStreamChunk = JSON.parse(line.slice(6));
                            onChunk(chunk);

                            if (chunk.done) {
                                onDone();
                            }
                        } catch {
                        }
                    }
                }
            }

            if (buffer.startsWith('data: ')) {
                try {
                    const chunk: ChatStreamChunk = JSON.parse(buffer.slice(6));
                    onChunk(chunk);
                } catch {
                }
            }

            onDone();
        })
        .catch((err) => {
            if (err.name !== 'AbortError') {
                onError(err.message);
            }
        });

    return controller;
}

export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
    if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
    return `${seconds.toFixed(1)}s`;
}

export function timeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
}
