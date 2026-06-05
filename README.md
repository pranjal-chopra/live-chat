# LiveChat — Full Stack Real-Time Chat App

A full-stack real-time chat application built with **Flask + SocketIO** (backend), **React + Vite** (frontend), and **MongoDB** (database).

## Features

- JWT authentication (register / login)
- Create and join chat rooms with unique 6-letter codes
- Persistent message history (survives server restarts)
- Real-time messaging via WebSockets
- Typing indicators
- Online member list per room
- Avatar colors assigned on registration

## Architecture

```
frontend (React + Vite)  :5173
        ↕ REST API (/api/*)
        ↕ WebSocket (/socket.io)
backend (Flask + SocketIO) :5000
        ↕ PyMongo
database (MongoDB)         :27017
```

## Tech Stack

| Layer     | Technology              |
|-----------|------------------------|
| Frontend  | React 18, Vite, Tailwind CSS |
| Backend   | Flask 3, Flask-SocketIO |
| Auth      | JWT (flask-jwt-extended) |
| Database  | MongoDB (PyMongo)       |
| Realtime  | Socket.IO               |
| Container | Docker Compose          |

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB running locally OR Docker

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env           # edit values if needed
python run.py                  # starts on :5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                    # starts on :5173
```

### With Docker (MongoDB only)

```bash
docker-compose up mongo        # just run MongoDB in Docker
# then run backend + frontend locally as above
```

### Full Docker

```bash
docker-compose up --build
# backend on :5000, mongo on :27017
# still run frontend locally: cd frontend && npm run dev
```

## Project Structure

```
live-chat/
├── backend/
│   ├── app/
│   │   ├── __init__.py        # app factory (create_app)
│   │   ├── config.py          # env-based configuration
│   │   ├── extensions.py      # db, jwt, socketio, bcrypt instances
│   │   ├── models/
│   │   │   ├── user.py        # User schema + methods
│   │   │   ├── room.py        # Room schema + methods
│   │   │   └── message.py     # Message schema + methods
│   │   ├── routes/
│   │   │   ├── auth.py        # /api/auth/* (register, login, me)
│   │   │   └── rooms.py       # /api/rooms/* (CRUD + messages)
│   │   └── sockets/
│   │       └── events.py      # all SocketIO event handlers
│   ├── run.py                 # entry point
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/axios.js       # axios instance + JWT interceptor
│   │   ├── context/AuthContext.jsx  # global auth state
│   │   ├── pages/
│   │   │   ├── AuthPage.jsx   # login + register
│   │   │   ├── Home.jsx       # room list + create/join
│   │   │   └── RoomPage.jsx   # chat room UI
│   │   ├── socket.js          # socket singleton
│   │   └── App.jsx            # routing + protected routes
│   └── vite.config.js         # proxy config
└── docker-compose.yml
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | — | Create account |
| POST | /api/auth/login | — | Login |
| GET | /api/auth/me | ✓ | Get current user |
| GET | /api/rooms/ | ✓ | List all rooms |
| POST | /api/rooms/ | ✓ | Create room |
| GET | /api/rooms/:code | ✓ | Get room by code |
| GET | /api/rooms/:code/messages | ✓ | Get message history |

## Socket Events

| Event (client → server) | Payload | Description |
|--------------------------|---------|-------------|
| join_room | { room_code } | Join a room |
| leave_room | { room_code } | Leave a room |
| send_message | { room_code, text } | Send a message |
| typing | — | Broadcast typing |
| stop_typing | — | Stop typing |

| Event (server → client) | Payload | Description |
|--------------------------|---------|-------------|
| message | Message object | New message |
| room_members | { members: [] } | Updated member list |
| user_typing | { username } | Someone is typing |
| user_stop_typing | { username } | Stopped typing |
| joined | { room_code } | Confirmed room join |
