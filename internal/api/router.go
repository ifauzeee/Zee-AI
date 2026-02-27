package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/ifauzeee/Zee-AI/internal/config"
	"github.com/ifauzeee/Zee-AI/internal/db"
	"github.com/ifauzeee/Zee-AI/internal/ollama"
)

type Handler struct {
	db     *db.DB
	ollama *ollama.Client
	cfg    *config.Config
	logger *slog.Logger
}

func NewHandler(database *db.DB, ollamaClient *ollama.Client, cfg *config.Config, logger *slog.Logger) *Handler {
	return &Handler{
		db:     database,
		ollama: ollamaClient,
		cfg:    cfg,
		logger: logger,
	}
}

func NewRouter(h *Handler) http.Handler {
	mux := http.NewServeMux()

	corsMiddleware := corsHandler(h.cfg)

	mux.HandleFunc("GET /api/health", h.HealthCheck)

	mux.HandleFunc("GET /api/models", h.ListModels)
	mux.HandleFunc("POST /api/models/pull", h.PullModel)
	mux.HandleFunc("DELETE /api/models/{name}", h.DeleteModel)

	mux.HandleFunc("GET /api/conversations", h.ListConversations)
	mux.HandleFunc("POST /api/conversations", h.CreateConversation)
	mux.HandleFunc("GET /api/conversations/{id}", h.GetConversation)
	mux.HandleFunc("PATCH /api/conversations/{id}", h.UpdateConversation)
	mux.HandleFunc("DELETE /api/conversations/{id}", h.DeleteConversation)

	mux.HandleFunc("GET /api/conversations/{id}/messages", h.GetMessages)

	mux.HandleFunc("POST /api/chat", h.ChatStream)

	mux.HandleFunc("GET /api/stats", h.GetStats)

	return corsMiddleware(logMiddleware(h.logger)(mux))
}

func corsHandler(cfg *config.Config) func(http.Handler) http.Handler {
	origins := cfg.CORSOrigins()
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			allowed := false
			for _, o := range origins {
				if o == origin || o == "*" {
					allowed = true
					break
				}
			}

			if allowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			}
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Max-Age", "86400")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func logMiddleware(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			next.ServeHTTP(w, r)
			if !strings.HasPrefix(r.URL.Path, "/api/chat") {
				logger.Info("request",
					"method", r.Method,
					"path", r.URL.Path,
					"duration", time.Since(start).String(),
				)
			}
		})
	}
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
