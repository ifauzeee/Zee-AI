package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/ifauzeee/Zee-AI/internal/db"
	"github.com/ifauzeee/Zee-AI/internal/ollama"
)

func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	ollamaOK := h.ollama.IsHealthy()
	status := "healthy"
	if !ollamaOK {
		status = "degraded"
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":  status,
		"ollama":  ollamaOK,
		"version": "1.0.0",
	})
}

func (h *Handler) ListModels(w http.ResponseWriter, r *http.Request) {
	models, err := h.ollama.ListModels()
	if err != nil {
		h.logger.Error("list models failed", "error", err)
		writeError(w, http.StatusServiceUnavailable, "Cannot connect to Ollama. Make sure Ollama is running.")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"models": models,
	})
}

func (h *Handler) PullModel(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		writeError(w, http.StatusBadRequest, "Model name is required")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, http.StatusInternalServerError, "Streaming not supported")
		return
	}

	h.logger.Info("pulling model", "name", req.Name)

	err := h.ollama.PullModel(req.Name, func(resp ollama.PullResponse) error {
		data, _ := json.Marshal(resp)
		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
		return nil
	})

	if err != nil {
		h.logger.Error("pull model failed", "name", req.Name, "error", err)
		fmt.Fprintf(w, "data: {\"error\": \"%s\"}\n\n", err.Error())
		flusher.Flush()
		return
	}

	fmt.Fprintf(w, "data: {\"status\": \"success\"}\n\n")
	flusher.Flush()
}

func (h *Handler) DeleteModel(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	if name == "" {
		writeError(w, http.StatusBadRequest, "Model name is required")
		return
	}

	if err := h.ollama.DeleteModel(name); err != nil {
		h.logger.Error("delete model failed", "name", name, "error", err)
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *Handler) ListConversations(w http.ResponseWriter, r *http.Request) {
	convos, err := h.db.ListConversations()
	if err != nil {
		h.logger.Error("list conversations failed", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to list conversations")
		return
	}
	if convos == nil {
		convos = []db.Conversation{}
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"conversations": convos,
	})
}

func (h *Handler) CreateConversation(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Title string `json:"title"`
		Model string `json:"model"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	if req.Title == "" {
		req.Title = "New Chat"
	}

	id := uuid.New().String()
	convo, err := h.db.CreateConversation(id, req.Title, req.Model)
	if err != nil {
		h.logger.Error("create conversation failed", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to create conversation")
		return
	}

	writeJSON(w, http.StatusCreated, convo)
}

func (h *Handler) GetConversation(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	convo, err := h.db.GetConversation(id)
	if err != nil {
		writeError(w, http.StatusNotFound, "Conversation not found")
		return
	}

	msgs, _ := h.db.GetMessages(id)
	if msgs == nil {
		msgs = []db.Message{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"conversation": convo,
		"messages":     msgs,
	})
}

func (h *Handler) UpdateConversation(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var req struct {
		Title string `json:"title"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	if err := h.db.UpdateConversationTitle(id, req.Title); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update conversation")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *Handler) DeleteConversation(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := h.db.DeleteConversation(id); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to delete conversation")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *Handler) GetMessages(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	msgs, err := h.db.GetMessages(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get messages")
		return
	}
	if msgs == nil {
		msgs = []db.Message{}
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"messages": msgs,
	})
}

type ChatAPIRequest struct {
	ConversationID string          `json:"conversation_id"`
	Model          string          `json:"model"`
	Message        string          `json:"message"`
	Options        *ollama.Options `json:"options,omitempty"`
}

func (h *Handler) ChatStream(w http.ResponseWriter, r *http.Request) {
	var req ChatAPIRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Message == "" || req.Model == "" {
		writeError(w, http.StatusBadRequest, "Message and model are required")
		return
	}

	if req.ConversationID == "" {
		id := uuid.New().String()
		_, err := h.db.CreateConversation(id, "New Chat", req.Model)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to create conversation")
			return
		}
		req.ConversationID = id
	}

	userMsg := &db.Message{
		ID:             uuid.New().String(),
		ConversationID: req.ConversationID,
		Role:           "user",
		Content:        req.Message,
		CreatedAt:      time.Now(),
	}
	if err := h.db.CreateMessage(userMsg); err != nil {
		h.logger.Error("save user message failed", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to save message")
		return
	}

	history, _ := h.db.GetMessages(req.ConversationID)
	var chatMessages []ollama.ChatMessage
	for _, m := range history {
		chatMessages = append(chatMessages, ollama.ChatMessage{
			Role:    m.Role,
			Content: m.Content,
		})
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, http.StatusInternalServerError, "Streaming not supported")
		return
	}

	initData, _ := json.Marshal(map[string]string{
		"type":            "init",
		"conversation_id": req.ConversationID,
	})
	fmt.Fprintf(w, "data: %s\n\n", initData)
	flusher.Flush()

	var fullResponse strings.Builder
	var totalTokens int
	var totalDuration float64

	chatReq := &ollama.ChatRequest{
		Model:    req.Model,
		Messages: chatMessages,
		Options:  req.Options,
	}

	err := h.ollama.ChatStream(chatReq, func(resp ollama.ChatResponse) error {
		chunk := map[string]interface{}{
			"type":    "chunk",
			"content": resp.Message.Content,
			"done":    resp.Done,
		}

		if resp.Done {
			totalTokens = resp.EvalCount + resp.PromptEvalCount
			totalDuration = float64(resp.TotalDuration) / 1e9
			chunk["total_tokens"] = totalTokens
			chunk["eval_count"] = resp.EvalCount
			chunk["duration"] = totalDuration
		}

		fullResponse.WriteString(resp.Message.Content)

		data, _ := json.Marshal(chunk)
		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
		return nil
	})

	if err != nil {
		h.logger.Error("chat stream failed", "error", err)
		errData, _ := json.Marshal(map[string]string{
			"type":  "error",
			"error": err.Error(),
		})
		fmt.Fprintf(w, "data: %s\n\n", errData)
		flusher.Flush()
		return
	}

	assistantMsg := &db.Message{
		ID:             uuid.New().String(),
		ConversationID: req.ConversationID,
		Role:           "assistant",
		Content:        fullResponse.String(),
		Model:          req.Model,
		TokensUsed:     totalTokens,
		Duration:       totalDuration,
		CreatedAt:      time.Now(),
	}
	h.db.CreateMessage(assistantMsg)
	h.db.TouchConversation(req.ConversationID)

	if len(history) <= 1 {
		go func() {
			title, err := h.ollama.GenerateTitle(req.Model, req.Message)
			if err != nil {
				h.logger.Warn("auto title failed", "error", err)
				return
			}
			title = strings.TrimSpace(title)
			if title != "" {
				h.db.UpdateConversationTitle(req.ConversationID, title)
			}
		}()
	}
}

func (h *Handler) GetStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.db.GetConversationStats()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get stats")
		return
	}

	ollamaOK := h.ollama.IsHealthy()
	stats["ollama_connected"] = ollamaOK

	models, err := h.ollama.ListModels()
	if err == nil {
		stats["models_count"] = len(models)
	}

	writeJSON(w, http.StatusOK, stats)
}
