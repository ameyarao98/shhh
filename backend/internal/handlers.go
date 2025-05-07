package internal

import (
	"net/http"
)

func Health(w http.ResponseWriter, r *http.Request) {
	_, err := w.Write([]byte("skrrrt"))
	if err != nil {
		http.Error(w, "Failed to write response", http.StatusInternalServerError)
		return
	}
}
