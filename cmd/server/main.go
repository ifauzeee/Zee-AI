package main

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/ifauzeee/Zee-AI/internal/api"
	"github.com/ifauzeee/Zee-AI/internal/config"
	"github.com/ifauzeee/Zee-AI/internal/db"
	"github.com/ifauzeee/Zee-AI/internal/ollama"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	cfg := config.Load()

	fmt.Println(`
  ╔══════════════════════════════════════════╗
  ║                                          ║
  ║          ⚡  Z E E - A I  ⚡            ║
  ║                                          ║
  ║    Self-Hosted AI/LLM Platform           ║
  ║    by Muhammad Ibnu Fauzi                ║
  ║                                          ║
  ╚══════════════════════════════════════════╝`)
	fmt.Println()

	database, err := db.New(cfg.DBPath)
	if err != nil {
		logger.Error("failed to initialize database", "error", err)
		os.Exit(1)
	}
	defer database.Close()
	logger.Info("database initialized", "path", cfg.DBPath)

	ollamaClient := ollama.New(cfg.OllamaBaseURL)

	if ollamaClient.IsHealthy() {
		logger.Info("ollama connected", "url", cfg.OllamaBaseURL)
		models, err := ollamaClient.ListModels()
		if err == nil {
			logger.Info("available models", "count", len(models))
			for _, m := range models {
				logger.Info("  model", "name", m.Name, "size", fmt.Sprintf("%.1fGB", float64(m.Size)/1e9))
			}
		}
	} else {
		logger.Warn("ollama is not reachable", "url", cfg.OllamaBaseURL)
		logger.Warn("start Ollama first: ollama serve")
	}

	handler := api.NewHandler(database, ollamaClient, cfg, logger)
	router := api.NewRouter(handler)

	addr := fmt.Sprintf("%s:%s", cfg.Host, cfg.Port)
	server := &http.Server{
		Addr:    addr,
		Handler: router,
	}

	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan
		logger.Info("shutting down...")
		server.Close()
	}()

	logger.Info("server starting", "address", "http://"+addr)
	logger.Info("API docs", "health", "http://"+addr+"/api/health")
	fmt.Println()

	if err := server.ListenAndServe(); err != http.ErrServerClosed {
		logger.Error("server error", "error", err)
		os.Exit(1)
	}
}
