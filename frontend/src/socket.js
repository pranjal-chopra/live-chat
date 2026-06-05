import { io } from 'socket.io-client'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || ''

let socket = null

export function getSocket() {
  return socket
}

export function connectSocket(token) {
  if (socket?.connected) return socket

  socket = io(BACKEND_URL, {
    auth: { token },
    transports: ['websocket'],
  })

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}