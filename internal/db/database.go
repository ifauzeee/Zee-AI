package db

import (
	"database/sql"
	"fmt"
	"time"

	_ "modernc.org/sqlite"
)

type DB struct {
	conn *sql.DB
}

type Conversation struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Model     string    `json:"model"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Message struct {
	ID             string    `json:"id"`
	ConversationID string    `json:"conversation_id"`
	Role           string    `json:"role"`
	Content        string    `json:"content"`
	Model          string    `json:"model,omitempty"`
	TokensUsed     int       `json:"tokens_used,omitempty"`
	Duration       float64   `json:"duration,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

func New(dbPath string) (*DB, error) {
	conn, err := sql.Open("sqlite", dbPath+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	conn.SetMaxOpenConns(1)
	conn.SetMaxIdleConns(1)

	if err := migrate(conn); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}

	return &DB{conn: conn}, nil
}

func migrate(conn *sql.DB) error {
	_, err := conn.Exec(`
		CREATE TABLE IF NOT EXISTS conversations (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL DEFAULT 'New Chat',
			model TEXT NOT NULL DEFAULT '',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS messages (
			id TEXT PRIMARY KEY,
			conversation_id TEXT NOT NULL,
			role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
			content TEXT NOT NULL,
			model TEXT DEFAULT '',
			tokens_used INTEGER DEFAULT 0,
			duration REAL DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
		);

		CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
		CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
	`)
	return err
}

func (d *DB) Close() error {
	return d.conn.Close()
}

func (d *DB) CreateConversation(id, title, model string) (*Conversation, error) {
	now := time.Now()
	_, err := d.conn.Exec(
		"INSERT INTO conversations (id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
		id, title, model, now, now,
	)
	if err != nil {
		return nil, err
	}
	return &Conversation{ID: id, Title: title, Model: model, CreatedAt: now, UpdatedAt: now}, nil
}

func (d *DB) GetConversation(id string) (*Conversation, error) {
	row := d.conn.QueryRow("SELECT id, title, model, created_at, updated_at FROM conversations WHERE id = ?", id)
	c := &Conversation{}
	err := row.Scan(&c.ID, &c.Title, &c.Model, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (d *DB) ListConversations() ([]Conversation, error) {
	rows, err := d.conn.Query("SELECT id, title, model, created_at, updated_at FROM conversations ORDER BY updated_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var convos []Conversation
	for rows.Next() {
		c := Conversation{}
		if err := rows.Scan(&c.ID, &c.Title, &c.Model, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		convos = append(convos, c)
	}
	return convos, nil
}

func (d *DB) UpdateConversationTitle(id, title string) error {
	_, err := d.conn.Exec("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?", title, time.Now(), id)
	return err
}

func (d *DB) DeleteConversation(id string) error {
	_, err := d.conn.Exec("DELETE FROM conversations WHERE id = ?", id)
	return err
}

func (d *DB) TouchConversation(id string) error {
	_, err := d.conn.Exec("UPDATE conversations SET updated_at = ? WHERE id = ?", time.Now(), id)
	return err
}

func (d *DB) CreateMessage(msg *Message) error {
	_, err := d.conn.Exec(
		"INSERT INTO messages (id, conversation_id, role, content, model, tokens_used, duration, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		msg.ID, msg.ConversationID, msg.Role, msg.Content, msg.Model, msg.TokensUsed, msg.Duration, msg.CreatedAt,
	)
	return err
}

func (d *DB) GetMessages(conversationID string) ([]Message, error) {
	rows, err := d.conn.Query(
		"SELECT id, conversation_id, role, content, model, tokens_used, duration, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
		conversationID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []Message
	for rows.Next() {
		m := Message{}
		if err := rows.Scan(&m.ID, &m.ConversationID, &m.Role, &m.Content, &m.Model, &m.TokensUsed, &m.Duration, &m.CreatedAt); err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}
	return msgs, nil
}

func (d *DB) GetConversationStats() (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	var totalConvos int
	d.conn.QueryRow("SELECT COUNT(*) FROM conversations").Scan(&totalConvos)
	stats["total_conversations"] = totalConvos

	var totalMsgs int
	d.conn.QueryRow("SELECT COUNT(*) FROM messages").Scan(&totalMsgs)
	stats["total_messages"] = totalMsgs

	var totalTokens int
	d.conn.QueryRow("SELECT COALESCE(SUM(tokens_used), 0) FROM messages").Scan(&totalTokens)
	stats["total_tokens"] = totalTokens

	return stats, nil
}
