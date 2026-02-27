package config

import (
	"os"
	"strings"
)

type Config struct {
	Port          string
	Host          string
	OllamaBaseURL string
	DBPath        string
	FrontendURL   string
	APISecretKey  string
}

func Load() *Config {
	return &Config{
		Port:          getEnv("PORT", "8080"),
		Host:          getEnv("HOST", "0.0.0.0"),
		OllamaBaseURL: getEnv("OLLAMA_BASE_URL", "http://localhost:11434"),
		DBPath:        getEnv("DB_PATH", "./zee-ai.db"),
		FrontendURL:   getEnv("FRONTEND_URL", "http://localhost:3000"),
		APISecretKey:  getEnv("API_SECRET_KEY", ""),
	}
}

func (c *Config) CORSOrigins() []string {
	origins := []string{c.FrontendURL}
	if c.FrontendURL != "http://localhost:3000" {
		origins = append(origins, "http://localhost:3000")
	}
	extra := getEnv("CORS_ORIGINS", "")
	if extra != "" {
		for _, o := range strings.Split(extra, ",") {
			origins = append(origins, strings.TrimSpace(o))
		}
	}
	return origins
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
