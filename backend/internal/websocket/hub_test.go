package websocket

import (
	"sync"
	"testing"
	"time"
)

func TestHubChannelBuffers(t *testing.T) {
	if cap(GlobalHub.Broadcast) != 256 {
		t.Errorf("GlobalHub.Broadcast buffer capacity = %d; want 256", cap(GlobalHub.Broadcast))
	}
	if cap(GlobalHub.Register) != 64 {
		t.Errorf("GlobalHub.Register buffer capacity = %d; want 64", cap(GlobalHub.Register))
	}
	if cap(GlobalHub.Unregister) != 64 {
		t.Errorf("GlobalHub.Unregister buffer capacity = %d; want 64", cap(GlobalHub.Unregister))
	}
}

func TestClientSafeClose(t *testing.T) {
	client := &Client{
		ID:   "test-client-1",
		Send: make(chan []byte, 256),
	}

	// Calling CloseSend concurrently should never panic
	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			client.CloseSend()
		}()
	}
	wg.Wait()

	// Verify channel is closed
	_, ok := <-client.Send
	if ok {
		t.Error("client.Send channel should be closed")
	}
}

func TestHubBroadcastJSONNonBlocking(t *testing.T) {
	// Creating a test hub without active runners
	testHub := &Hub{
		Clients:    make(map[*Client]bool),
		Broadcast:  make(chan []byte, 2),
		Register:   make(chan *Client, 2),
		Unregister: make(chan *Client, 2),
	}

	// Fill buffer
	testHub.BroadcastJSON(map[string]string{"msg": "1"})
	testHub.BroadcastJSON(map[string]string{"msg": "2"})

	// Third call should not block even when buffer is full
	done := make(chan bool)
	go func() {
		testHub.BroadcastJSON(map[string]string{"msg": "3 (dropped)"})
		done <- true
	}()

	select {
	case <-done:
		// Succeeded without blocking
	case <-time.After(1 * time.Second):
		t.Fatal("BroadcastJSON blocked when channel buffer was full")
	}
}
