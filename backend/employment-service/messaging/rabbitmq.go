// Package messaging provides RabbitMQ integration for the chat feature.
// Flow:
//   POST /messages  →  publish to "chat" exchange  →  consumer goroutine persists to MongoDB
//                                                   →  WebSocket hub fans out to connected receivers
package messaging

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	exchangeName = "chat"
	queueName    = "chat.messages"
	routingKey   = "message.new"
)

// MessagePayload is the JSON body published to / consumed from RabbitMQ.
type MessagePayload struct {
	ID           string    `json:"id"`
	SenderID     string    `json:"sender_id"`
	ReceiverID   string    `json:"receiver_id"`
	JobListingID string    `json:"job_listing_id,omitempty"`
	Content      string    `json:"content"`
	SentAt       time.Time `json:"sent_at"`
	Read         bool      `json:"read"`
}

// Broker wraps a single AMQP connection + channel with reconnect logic.
type Broker struct {
	url    string
	conn   *amqp.Connection
	ch     *amqp.Channel
	mu     sync.Mutex
	logger *log.Logger
}

// NewBroker creates a Broker and establishes the initial connection.
// It reads RABBITMQ_URL from the environment (falls back to localhost).
func NewBroker(logger *log.Logger) (*Broker, error) {
	url := os.Getenv("RABBITMQ_URL")
	if url == "" {
		url = "amqp://guest:guest@localhost:5672/"
	}
	b := &Broker{url: url, logger: logger}
	if err := b.connect(); err != nil {
		return nil, err
	}
	return b, nil
}

func (b *Broker) connect() error {
	conn, err := amqp.Dial(b.url)
	if err != nil {
		return fmt.Errorf("rabbitmq dial: %w", err)
	}
	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return fmt.Errorf("rabbitmq channel: %w", err)
	}
	// Declare a durable topic exchange
	if err := ch.ExchangeDeclare(exchangeName, "topic", true, false, false, false, nil); err != nil {
		ch.Close()
		conn.Close()
		return fmt.Errorf("rabbitmq exchange declare: %w", err)
	}
	// Declare a durable queue and bind it
	if _, err := ch.QueueDeclare(queueName, true, false, false, false, nil); err != nil {
		ch.Close()
		conn.Close()
		return fmt.Errorf("rabbitmq queue declare: %w", err)
	}
	if err := ch.QueueBind(queueName, routingKey, exchangeName, false, nil); err != nil {
		ch.Close()
		conn.Close()
		return fmt.Errorf("rabbitmq queue bind: %w", err)
	}
	b.conn = conn
	b.ch = ch
	b.logger.Println("[rabbitmq] connected")
	return nil
}

// ensureConnected reconnects if the channel/connection is closed.
func (b *Broker) ensureConnected() error {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.ch != nil && !b.conn.IsClosed() {
		return nil
	}
	b.logger.Println("[rabbitmq] reconnecting…")
	return b.connect()
}

// Publish sends a MessagePayload to the chat exchange.
func (b *Broker) Publish(ctx context.Context, payload MessagePayload) error {
	if err := b.ensureConnected(); err != nil {
		return err
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.ch.PublishWithContext(ctx, exchangeName, routingKey, false, false, amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		Body:         body,
	})
}

// Consume starts a goroutine that reads messages from the queue and calls handler for each one.
// handler receives the raw payload; it should persist to MongoDB and push to the WebSocket hub.
// Consume reconnects automatically on channel errors.
func (b *Broker) Consume(handler func(MessagePayload)) {
	go func() {
		for {
			if err := b.ensureConnected(); err != nil {
				b.logger.Printf("[rabbitmq] consume reconnect failed: %v – retrying in 5s", err)
				time.Sleep(5 * time.Second)
				continue
			}

			b.mu.Lock()
			deliveries, err := b.ch.Consume(queueName, "", false, false, false, false, nil)
			b.mu.Unlock()
			if err != nil {
				b.logger.Printf("[rabbitmq] consume start failed: %v – retrying in 5s", err)
				time.Sleep(5 * time.Second)
				continue
			}

			b.logger.Println("[rabbitmq] consumer started")
			for d := range deliveries {
				var p MessagePayload
				if err := json.Unmarshal(d.Body, &p); err != nil {
					b.logger.Printf("[rabbitmq] bad message body: %v", err)
					d.Nack(false, false)
					continue
				}
				handler(p)
				d.Ack(false)
			}
			b.logger.Println("[rabbitmq] consumer channel closed – reconnecting")
		}
	}()
}

// Close gracefully shuts down the broker.
func (b *Broker) Close() {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.ch != nil {
		b.ch.Close()
	}
	if b.conn != nil {
		b.conn.Close()
	}
}
