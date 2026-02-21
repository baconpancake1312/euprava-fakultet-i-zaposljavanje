/**
 * useChat Socket – connects to the employment-service WebSocket endpoint
 * and delivers incoming messages in real time.
 *
 * Usage:
 *   const { lastMessage } = useChatSocket(userId)
 *
 * `lastMessage` is the most-recently received MessagePayload (or null).
 * The hook reconnects automatically with exponential back-off.
 */
"use client"

import { useEffect, useRef, useState, useCallback } from "react"

export interface IncomingMessage {
  id: string
  sender_id: string
  receiver_id: string
  job_listing_id?: string
  content: string
  sent_at: string
  read: boolean
}

const WS_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_EMPLOYMENT_WS_URL) ||
  "ws://localhost:8089"

export function useChatSocket(userId: string | null | undefined) {
  const [lastMessage, setLastMessage] = useState<IncomingMessage | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryDelay = useRef(1000)
  const unmounted = useRef(false)

  const connect = useCallback(() => {
    if (!userId || unmounted.current) return

    const url = `${WS_BASE}/ws/messages?userId=${userId}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      retryDelay.current = 1000 // reset back-off on successful connect
    }

    ws.onmessage = (event) => {
      try {
        const msg: IncomingMessage = JSON.parse(event.data)
        setLastMessage(msg)
      } catch {
        // ignore malformed frames
      }
    }

    ws.onclose = () => {
      if (unmounted.current) return
      // Exponential back-off: 1s → 2s → 4s → … capped at 30s
      retryRef.current = setTimeout(() => {
        retryDelay.current = Math.min(retryDelay.current * 2, 30_000)
        connect()
      }, retryDelay.current)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [userId])

  useEffect(() => {
    unmounted.current = false
    connect()
    return () => {
      unmounted.current = true
      if (retryRef.current) clearTimeout(retryRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { lastMessage }
}
