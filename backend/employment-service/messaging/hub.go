package messaging

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// client represents a single WebSocket connection belonging to a user.
type client struct {
	userID string
	conn   *websocket.Conn
	send   chan []byte
}

// Hub manages all active WebSocket connections and fans out messages.
type Hub struct {
	mu      sync.RWMutex
	clients map[string][]*client // userID → connections
	logger  *log.Logger
}

// NewHub creates an empty Hub.
func NewHub(logger *log.Logger) *Hub {
	return &Hub{
		clients: make(map[string][]*client),
		logger:  logger,
	}
}

// Register upgrades the HTTP connection to WebSocket and registers the client.
// userID is taken from the URL query param ?userId=<id>.
func (h *Hub) Register(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("userId")
	if userID == "" {
		http.Error(w, "userId query param required", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.logger.Printf("[hub] upgrade error: %v", err)
		return
	}

	c := &client{userID: userID, conn: conn, send: make(chan []byte, 64)}

	h.mu.Lock()
	h.clients[userID] = append(h.clients[userID], c)
	h.mu.Unlock()

	h.logger.Printf("[hub] client connected: %s", userID)

	// writer goroutine
	go func() {
		defer func() {
			conn.Close()
			h.unregister(c)
		}()
		for msg := range c.send {
			if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		}
	}()

	// reader goroutine – we only need to drain pings / detect close
	go func() {
		defer func() {
			close(c.send)
		}()
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
		}
	}()
}

func (h *Hub) unregister(c *client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	list := h.clients[c.userID]
	for i, cl := range list {
		if cl == c {
			h.clients[c.userID] = append(list[:i], list[i+1:]...)
			break
		}
	}
	if len(h.clients[c.userID]) == 0 {
		delete(h.clients, c.userID)
	}
	h.logger.Printf("[hub] client disconnected: %s", c.userID)
}

// Deliver sends a MessagePayload to all WebSocket connections of the receiver.
func (h *Hub) Deliver(payload MessagePayload) {
	data, err := json.Marshal(payload)
	if err != nil {
		h.logger.Printf("[hub] marshal error: %v", err)
		return
	}

	h.mu.RLock()
	targets := h.clients[payload.ReceiverID]
	h.mu.RUnlock()

	for _, c := range targets {
		select {
		case c.send <- data:
		default:
			h.logger.Printf("[hub] send buffer full for %s, dropping", payload.ReceiverID)
		}
	}
}
