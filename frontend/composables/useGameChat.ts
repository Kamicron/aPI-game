import { ref, onMounted, onUnmounted, unref, type Ref } from 'vue'
import { io, type Socket } from 'socket.io-client'

export type ChatMessageType = 'user' | 'system'

export interface ChatMessage {
  type: ChatMessageType
  roomId: string
  content: string
  authorId?: string
  timestamp: string
}

interface UseGameChatOptions {
  backendUrl?: string
}

export function useGameChat(
  roomId: Ref<string> | string,
  playerId: Ref<string> | string,
  options: UseGameChatOptions = {}
) {
  const messages = ref<ChatMessage[]>([])
  const connected = ref(false)

  const url =
    options.backendUrl ||
    (process.env.NUXT_PUBLIC_CHAT_URL as string | undefined) ||
    'http://localhost:5001'

  let socket: Socket | null = null

  const getRoomId = () => unref(roomId)
  const getPlayerId = () => unref(playerId)

  function connect() {
    if (socket) return

    socket = io(url, {
      withCredentials: true,
      transports: ['websocket'],
    })

    socket.on('connect', () => {
      connected.value = true
      socket?.emit('joinRoom', {
        roomId: getRoomId(),
        playerId: getPlayerId(),
      })
    })

    socket.on('disconnect', () => {
      connected.value = false
    })

    socket.on('message', (message: ChatMessage) => {
      messages.value.push(message)
    })
  }

  function disconnect() {
    if (!socket) return

    socket.emit('leaveRoom', {
      roomId: getRoomId(),
      playerId: getPlayerId(),
    })
    socket.disconnect()
    socket = null
    connected.value = false
  }

  function sendMessage(content: string) {
    const trimmed = content.trim()
    if (!trimmed || !socket) return

    socket.emit('sendMessage', {
      roomId: getRoomId(),
      authorId: getPlayerId(),
      content: trimmed,
    })
  }

  onMounted(connect)
  onUnmounted(disconnect)

  return {
    messages,
    connected,
    sendMessage,
  }
}
