import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { connectSocket } from '../socket'
import api from '../api/axios'

export default function Home() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [newRoomName, setNewRoomName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  // connect socket on home page load
  useEffect(() => {
    const token = localStorage.getItem('token')
    connectSocket(token)
  }, [])

  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    try {
      const res = await api.get('/api/rooms/')
      setRooms(res.data.rooms)
    } catch (err) {
      console.error('Failed to fetch rooms', err)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newRoomName.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await api.post('/api/rooms/', { name: newRoomName.trim() })
      navigate(`/room/${res.data.room.code}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create room')
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = (e) => {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    navigate(`/room/${code}`)
  }

  const handleLogout = () => {
    logout()
    navigate('/auth')
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* topbar */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-violet-600 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="font-bold text-white">LiveChat</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: user?.avatar_color }}
            >
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <span className="text-sm text-zinc-300">{user?.username}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600 rounded-lg px-3 py-1.5 transition"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* create room */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">Create a room</h2>
            <form onSubmit={handleCreate} className="flex gap-2">
              <input
                type="text"
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                placeholder="Room name..."
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition"
              />
              <button
                type="submit"
                disabled={creating}
                className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
              >
                Create
              </button>
            </form>
          </div>

          {/* join by code */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">Join with a code</h2>
            <form onSubmit={handleJoin} className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABCDEF"
                maxLength={6}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition font-mono tracking-widest"
              />
              <button
                type="submit"
                className="bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                Join
              </button>
            </form>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {/* room list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-300">Your rooms</h2>
            <button onClick={fetchRooms} className="text-xs text-zinc-500 hover:text-zinc-300 transition">
              Refresh
            </button>
          </div>

          {rooms.length === 0 ? (
            <div className="text-center py-16 text-zinc-600">
              <p className="text-sm">No rooms yet. Create one or join with a code above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => navigate(`/room/${room.code}`)}
                  className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 text-left transition group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-white text-sm group-hover:text-violet-300 transition">{room.name}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">by {room.created_by}</p>
                    </div>
                    <span className="text-xs font-mono text-zinc-600 bg-zinc-800 px-2 py-1 rounded-md">{room.code}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-xs text-zinc-500">
                      {room.members.length} online
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
