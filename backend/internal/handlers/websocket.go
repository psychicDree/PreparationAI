package handlers

import (
	"log"
	"strings"
	"sync"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"preparation-ai/internal/services"
)

// WebSocketManager manages all active WebSocket connections
type WebSocketManager struct {
	clients    map[string]*websocket.Conn
	register   chan *Client
	unregister chan *Client
	broadcast  chan []byte
	mutex      sync.RWMutex
}

// Client represents a WebSocket client
type Client struct {
	ID        string
	UserID    string
	SessionID string
	Conn      *websocket.Conn
	Manager   *WebSocketManager
}

// Message types for WebSocket communication
type WSMessage struct {
	Type      string      `json:"type"`
	SessionID string      `json:"session_id,omitempty"`
	Data      interface{} `json:"data,omitempty"`
	Error     string      `json:"error,omitempty"`
}

// NewWebSocketManager creates a new WebSocket manager
func NewWebSocketManager() *WebSocketManager {
	return &WebSocketManager{
		clients:    make(map[string]*websocket.Conn),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan []byte),
	}
}

// Start starts the WebSocket manager
func (m *WebSocketManager) Start() {
	for {
		select {
		case client := <-m.register:
			m.mutex.Lock()
			m.clients[client.ID] = client.Conn
			m.mutex.Unlock()
			log.Printf("Client %s connected", client.ID)

		case client := <-m.unregister:
			m.mutex.Lock()
			if conn, ok := m.clients[client.ID]; ok {
				conn.Close()
				delete(m.clients, client.ID)
			}
			m.mutex.Unlock()
			log.Printf("Client %s disconnected", client.ID)

		case message := <-m.broadcast:
			m.mutex.RLock()
			for _, conn := range m.clients {
				if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
					log.Printf("Error broadcasting message: %v", err)
				}
			}
			m.mutex.RUnlock()
		}
	}
}

// BroadcastToSession sends a message to all clients in a specific session
func (m *WebSocketManager) BroadcastToSession(sessionID string, message WSMessage) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	for clientID, conn := range m.clients {
		// In a real implementation, you'd track which clients are in which sessions
		// For now, we'll broadcast to all clients
		if err := conn.WriteJSON(message); err != nil {
			log.Printf("Error sending message to client %s: %v", clientID, err)
		}
	}
}

// Global WebSocket manager instance
var wsManager = NewWebSocketManager()

// WebSocketUpgrade authenticates and upgrades an HTTP connection to a
// WebSocket. The JWT is supplied either as a `token` query parameter (browser
// WebSocket clients cannot set custom headers) or an Authorization header. The
// authenticated user ID is stored in locals for the handler to read.
func WebSocketUpgrade(c *fiber.Ctx) error {
	if !websocket.IsWebSocketUpgrade(c) {
		return fiber.ErrUpgradeRequired
	}

	token := c.Query("token")
	if token == "" {
		token = strings.TrimPrefix(c.Get("Authorization"), "Bearer ")
	}
	if token == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Missing token"})
	}

	claims, err := services.ValidateJWT(token)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	if blacklisted, err := services.IsTokenBlacklisted(token); err != nil || blacklisted {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token has been revoked"})
	}

	c.Locals("userID", claims.UserID)
	return c.Next()
}

// WebSocketHandler handles WebSocket connections
func WebSocketHandler(c *websocket.Conn) {
	// Generate a unique client ID
	clientID := c.Query("client_id", "anonymous")
	// userID is set by WebSocketUpgrade from the validated JWT, not the client.
	userID, _ := c.Locals("userID").(string)
	sessionID := c.Query("session_id", "")

	client := &Client{
		ID:        clientID,
		UserID:    userID,
		SessionID: sessionID,
		Conn:      c,
		Manager:   wsManager,
	}

	// Register client
	wsManager.register <- client

	// Send welcome message
	welcomeMsg := WSMessage{
		Type: "connected",
		Data: map[string]string{
			"client_id": clientID,
			"message":   "Connected to PreparationAI WebSocket",
		},
	}
	c.WriteJSON(welcomeMsg)

	// Handle incoming messages
	for {
		var msg WSMessage
		if err := c.ReadJSON(&msg); err != nil {
			log.Printf("Error reading WebSocket message: %v", err)
			break
		}

		// Handle different message types
		switch msg.Type {
		case "ping":
			// Respond to ping with pong
			pongMsg := WSMessage{
				Type: "pong",
				Data: map[string]string{"timestamp": "now"},
			}
			c.WriteJSON(pongMsg)

		case "join_session":
			// Client wants to join a specific session
			client.SessionID = msg.SessionID
			joinMsg := WSMessage{
				Type:      "session_joined",
				SessionID: msg.SessionID,
				Data:      map[string]string{"message": "Joined session " + msg.SessionID},
			}
			c.WriteJSON(joinMsg)

		case "question_started":
			// Notify that a question has started
			broadcastMsg := WSMessage{
				Type:      "question_started",
				SessionID: client.SessionID,
				Data:      msg.Data,
			}
			wsManager.BroadcastToSession(client.SessionID, broadcastMsg)

		case "response_submitted":
			// Notify that a response has been submitted
			broadcastMsg := WSMessage{
				Type:      "response_submitted",
				SessionID: client.SessionID,
				Data:      msg.Data,
			}
			wsManager.BroadcastToSession(client.SessionID, broadcastMsg)

		case "session_completed":
			// Notify that a session has been completed
			broadcastMsg := WSMessage{
				Type:      "session_completed",
				SessionID: client.SessionID,
				Data:      msg.Data,
			}
			wsManager.BroadcastToSession(client.SessionID, broadcastMsg)

		default:
			// Echo back unknown message types
			responseMsg := WSMessage{
				Type:  "echo",
				Data:  msg.Data,
				Error: "Unknown message type: " + msg.Type,
			}
			c.WriteJSON(responseMsg)
		}
	}

	// Unregister client when connection closes
	wsManager.unregister <- client
}

// BroadcastSessionUpdate broadcasts an update to all clients in a session
func BroadcastSessionUpdate(sessionID string, updateType string, data interface{}) {
	message := WSMessage{
		Type:      updateType,
		SessionID: sessionID,
		Data:      data,
	}
	wsManager.BroadcastToSession(sessionID, message)
}

// GetWebSocketManager returns the global WebSocket manager
func GetWebSocketManager() *WebSocketManager {
	return wsManager
}
