package ollama

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	baseURL    string
	httpClient *http.Client
}

type Model struct {
	Name       string    `json:"name"`
	Model      string    `json:"model"`
	ModifiedAt time.Time `json:"modified_at"`
	Size       int64     `json:"size"`
	Digest     string    `json:"digest"`
	Details    struct {
		ParentModel       string   `json:"parent_model"`
		Format            string   `json:"format"`
		Family            string   `json:"family"`
		Families          []string `json:"families"`
		ParameterSize     string   `json:"parameter_size"`
		QuantizationLevel string   `json:"quantization_level"`
	} `json:"details"`
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatRequest struct {
	Model    string        `json:"model"`
	Messages []ChatMessage `json:"messages"`
	Stream   bool          `json:"stream"`
	Options  *Options      `json:"options,omitempty"`
}

type Options struct {
	Temperature float64 `json:"temperature,omitempty"`
	TopP        float64 `json:"top_p,omitempty"`
	TopK        int     `json:"top_k,omitempty"`
	NumPredict  int     `json:"num_predict,omitempty"`
	Seed        int     `json:"seed,omitempty"`
}

type ChatResponse struct {
	Model     string      `json:"model"`
	CreatedAt time.Time   `json:"created_at"`
	Message   ChatMessage `json:"message"`
	Done      bool        `json:"done"`

	TotalDuration      int64 `json:"total_duration,omitempty"`
	LoadDuration       int64 `json:"load_duration,omitempty"`
	PromptEvalCount    int   `json:"prompt_eval_count,omitempty"`
	PromptEvalDuration int64 `json:"prompt_eval_duration,omitempty"`
	EvalCount          int   `json:"eval_count,omitempty"`
	EvalDuration       int64 `json:"eval_duration,omitempty"`
}

type PullRequest struct {
	Name   string `json:"name"`
	Stream bool   `json:"stream"`
}

type PullResponse struct {
	Status    string `json:"status"`
	Digest    string `json:"digest,omitempty"`
	Total     int64  `json:"total,omitempty"`
	Completed int64  `json:"completed,omitempty"`
}

type GenerateRequest struct {
	Model  string `json:"model"`
	Prompt string `json:"prompt"`
	Stream bool   `json:"stream"`
}

func New(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Minute,
		},
	}
}

func (c *Client) ListModels() ([]Model, error) {
	resp, err := c.httpClient.Get(c.baseURL + "/api/tags")
	if err != nil {
		return nil, fmt.Errorf("list models: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("list models: status %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Models []Model `json:"models"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode models: %w", err)
	}

	return result.Models, nil
}

func (c *Client) ChatStream(req *ChatRequest, onChunk func(ChatResponse) error) error {
	req.Stream = true

	body, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequest("POST", c.baseURL+"/api/chat", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("chat request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("chat error: status %d: %s", resp.StatusCode, string(respBody))
	}

	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 1024*1024), 1024*1024)

	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		var chatResp ChatResponse
		if err := json.Unmarshal(line, &chatResp); err != nil {
			continue
		}

		if err := onChunk(chatResp); err != nil {
			return err
		}

		if chatResp.Done {
			break
		}
	}

	return scanner.Err()
}

func (c *Client) Chat(req *ChatRequest) (*ChatResponse, error) {
	req.Stream = false

	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal: %w", err)
	}

	resp, err := c.httpClient.Post(c.baseURL+"/api/chat", "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("chat: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("chat error: status %d: %s", resp.StatusCode, string(respBody))
	}

	var chatResp ChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return nil, fmt.Errorf("decode: %w", err)
	}

	return &chatResp, nil
}

func (c *Client) PullModel(name string, onProgress func(PullResponse) error) error {
	req := PullRequest{Name: name, Stream: true}
	body, _ := json.Marshal(req)

	resp, err := c.httpClient.Post(c.baseURL+"/api/pull", "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("pull model: %w", err)
	}
	defer resp.Body.Close()

	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 1024*1024), 1024*1024)

	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		var pullResp PullResponse
		if err := json.Unmarshal(line, &pullResp); err != nil {
			continue
		}

		if onProgress != nil {
			if err := onProgress(pullResp); err != nil {
				return err
			}
		}
	}

	return scanner.Err()
}

func (c *Client) DeleteModel(name string) error {
	body, _ := json.Marshal(map[string]string{"name": name})
	req, err := http.NewRequest("DELETE", c.baseURL+"/api/delete", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("delete model: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("delete error: status %d: %s", resp.StatusCode, string(respBody))
	}
	return nil
}

func (c *Client) IsHealthy() bool {
	resp, err := c.httpClient.Get(c.baseURL + "/api/tags")
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

func (c *Client) GenerateTitle(model, userMessage string) (string, error) {
	req := &ChatRequest{
		Model: model,
		Messages: []ChatMessage{
			{
				Role:    "system",
				Content: "Generate a very short title (max 6 words) for a conversation that starts with the following message. Reply with ONLY the title, no quotes, no punctuation at the end.",
			},
			{
				Role:    "user",
				Content: userMessage,
			},
		},
		Stream: false,
		Options: &Options{
			Temperature: 0.3,
			NumPredict:  20,
		},
	}

	resp, err := c.Chat(req)
	if err != nil {
		return "", err
	}

	title := resp.Message.Content
	if len(title) > 80 {
		title = title[:80]
	}
	return title, nil
}
