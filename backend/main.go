package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/ameyarao98/shhh/backend/internal"
	"github.com/go-chi/chi/v5"
)

func main() {
	r := chi.NewRouter()
	r.Get("/health", internal.Health)

	fmt.Println("Server running")
	err := http.ListenAndServe(":8000", nil)
	if err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
