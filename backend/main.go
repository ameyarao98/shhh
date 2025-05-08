package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type Room struct {
	clients []*Client
}

type Client struct {
	conn     *websocket.Conn
	username string
}

type Message struct {
	Username string `json:"username"`
	Content  string `json:"content"`
}

type CreateRoomResponse struct {
	RoomID string `json:"roomId"`
}

var rooms sync.Map // map[string]*Room

func main() {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/health", healthHandler)
	r.Post("/room/create", createRoomHandler)
	r.Post("/room/{id}/join", joinRoomHandler)

	log.Println("Server starting on :8000")
	log.Fatal(http.ListenAndServe(":8000", r))
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	_, err := w.Write([]byte("skrrrt"))
	if err != nil {
		http.Error(w, "Failed to write response", http.StatusInternalServerError)
		return
	}
}

func createRoomHandler(w http.ResponseWriter, r *http.Request) {
	roomID := uuid.New().String()
	room := &Room{
		clients: []*Client{},
	}
	rooms.Store(roomID, room)

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(CreateRoomResponse{RoomID: roomID}); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

func joinRoomHandler(w http.ResponseWriter, r *http.Request) {
	roomID := chi.URLParam(r, "id")
	if roomID == "" {
		http.Error(w, "Room ID required", http.StatusBadRequest)
		return
	}

	roomInterface, ok := rooms.Load(roomID)
	if !ok {
		http.Error(w, "Room not found", http.StatusNotFound)
		return
	}
	room := roomInterface.(*Room)

	username := r.URL.Query().Get("username")
	if username == "" {
		http.Error(w, "Username required", http.StatusBadRequest)
		return
	}
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all origins for simplicity
		},
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Could not upgrade to WebSocket", http.StatusInternalServerError)
		return
	}

	client := &Client{
		username: username,
		conn:     conn,
	}
	room.clients = append(room.clients, client)
}
