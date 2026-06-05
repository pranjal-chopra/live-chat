import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSocket, connectSocket } from '../socket'
import api from '../api/axios'

export default function RoomPage() {
  const { code } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [room, setRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [members, setMembers] = useState([])
  const [text, setText] = useState('')
  const [typingUsers, setTypingUsers] = useState([])
  const [notFound, setNotFound] = useState(false)

  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const socketRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // load room info + message history via REST
  useEffect(() => {
    const loadRoom = async () => {
      try {
        const [roomRes, msgRes] = await Promise.all([
          api.get(`/api/rooms/${code}`),
          api.get(`/api/rooms/${code}/messages`),
        ])
        setRoom(roomRes.data.room)
        setMessages(msgRes.data.messages)
      } catch (err) {
        if (err.response?.status === 404) setNotFound(true)
      }
    }
    loadRoom()
  }, [code])

  // connect to socket and join room
  useEffect(() => {
    const token = localStorage.getItem('token')
    const socket = connectSocket(token)
    socketRef.current = socket

    socket.emit('join_room', { room_code: code })

    socket.on('message', (msg) => {
      setMessages(prev => [...prev, msg])
    })

    socket.on('room_members', ({ members }) => {
      setMembers(members)
    })

    socket.on('user_typing', ({ username }) => {
      setTypingUsers(prev => [...new Set([...prev, username])])
    })

    socket.on('user_stop_typing', ({ username }) => {
      setTypingUsers(prev => prev.filter(u => u !== username))
    })

    socket.on('error', ({ message }) => {
      console.error('Socket error:', message)
      navigate('/')
    })

    return () => {
      socket.emit('leave_room', { room_code: code })
      socket.off('message')
      socket.off('room_members')
      socket.off('user_typing')
      socket.off('user_stop_typing')
      socket.off('error')
    }
  }, [code])

  const handleSend = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    socketRef.current?.emit('send_message', { room_code: code, text: text.trim() })
    setText('')
    // stop typing indicator when message sent
    socketRef.current?.emit('stop_typing', {})
    clearTimeout(typingTimeoutRef.current)
  }

  const handleTyping = (e) => {
    setText(e.target.value)
    socketRef.current?.emit('typing', {})
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('stop_typing', {})
    }, 1500) // stop typing after 1.5s of inactivity
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <p className="text-zinc-400 text-sm mb-4">Room not found</p>
          <button onClick={() => navigate('/')} className="text-violet-400 text-sm hover:underline">
            Back to home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-950">
      {/* header */}
      <header className="border-b border-zinc-800 px-5 py-3 flex items-center gap-4 shrink-0">
        <button onClick={() => navigate('/')} className="text-zinc-500 hover:text-zinc-300 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-white text-sm truncate">{room?.name || code}</h1>
          <p className="text-zinc-500 text-xs font-mono">{code}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-zinc-400">{members.length} online</span>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* messages */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-1">
            {messages.map((msg, i) => {
              if (msg.type === 'system') {
                return (
                  <div key={msg.id || i} className="text-center py-1">
                    <span className="text-xs text-zinc-600">{msg.text}</span>
                  </div>
                )
              }

              const isOwn = msg.username === user?.username
              const prevMsg = messages[i - 1]
              const showName = !prevMsg || prevMsg.username !== msg.username || prevMsg.type === 'system'

              return (
                <div key={msg.id || i} className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                  {/* avatar — only show on first message in a group */}
                  <div className="w-6 shrink-0">
                    {showName && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: msg.avatar_color }}
                      >
                        {msg.username[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                    {showName && (
                      <span className={`text-[10px] text-zinc-500 mb-0.5 px-1 ${isOwn ? 'text-right' : ''}`}>
                        {isOwn ? 'You' : msg.username}
                      </span>
                    )}
                    <div
                      className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                        isOwn
                          ? 'bg-violet-600 text-white rounded-br-sm'
                          : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-zinc-600 px-1 mt-0.5">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )
            })}

            {/* typing indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 py-1">
                <div className="w-6 shrink-0" />
                <div className="bg-zinc-800 rounded-2xl px-3 py-2 flex items-center gap-1">
                  <span className="text-xs text-zinc-400">
                    {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing
                  </span>
                  <div className="flex gap-0.5 ml-1">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-1 h-1 rounded-full bg-zinc-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* input */}
          <div className="border-t border-zinc-800 px-4 py-3 shrink-0">
            <form onSubmit={handleSend} className="flex items-center gap-3">
              <input
                type="text"
                value={text}
                onChange={handleTyping}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${room?.name || ''}...`}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition"
                autoFocus
              />
              <button
                type="submit"
                disabled={!text.trim()}
                className="w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition"
              >
                <svg className="w-4 h-4 text-white rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>

        {/* online members sidebar */}
        <div className="w-52 border-l border-zinc-800 px-4 py-4 hidden md:block shrink-0">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Online — {members.length}
          </p>
          <div className="space-y-2">
            {members.map(username => (
              <div key={username} className="flex items-center gap-2">
                <div className="relative">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: '#8b5cf6' }}
                  >
                    {username[0]?.toUpperCase()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-zinc-950" />
                </div>
                <span className="text-xs text-zinc-300 truncate">
                  {username === user?.username ? `${username} (you)` : username}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
