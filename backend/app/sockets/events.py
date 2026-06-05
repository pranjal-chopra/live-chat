from flask import request
from flask_socketio import join_room, leave_room, emit
from flask_jwt_extended import decode_token
from jwt.exceptions import InvalidTokenError

from ..extensions import socketio
from ..models.room import Room
from ..models.message import Message
from ..models.user import User

# in-memory map of socket_id → {username, room, avatar_color}
# this is fine — it's just connection state, not persistent data
connected_users = {}


def _get_user_from_token(token: str):
    """Decode JWT manually for socket auth (sockets don't use HTTP headers)."""
    try:
        decoded = decode_token(token)
        username = decoded["sub"]
        user = User.find_by_username(username)
        return user
    except (InvalidTokenError, Exception):
        return None


@socketio.on("connect")
def on_connect(auth):
    """
    Client sends: { token: "JWT..." }
    We decode it to identify who connected.
    """
    token = (auth or {}).get("token")
    user = _get_user_from_token(token) if token else None

    if not user:
        return False  # reject connection

    connected_users[request.sid] = {
        "username": user["username"],
        "avatar_color": user["avatar_color"],
        "room": None,
    }


@socketio.on("disconnect")
def on_disconnect():
    user_data = connected_users.pop(request.sid, None)
    if not user_data or not user_data["room"]:
        return

    room_code = user_data["room"]
    username = user_data["username"]

    Room.remove_member(room_code, username)

    # broadcast system message
    sys_msg = Message.create(
        room_id=room_code,
        username="system",
        avatar_color="#6b7280",
        text=f"{username} left the room",
        msg_type="system"
    )
    emit("message", Message.to_public(sys_msg), to=room_code)
    emit("room_members", _get_members(room_code), to=room_code)


@socketio.on("join_room")
def on_join_room(data):
    """Client sends: { room_code: "ABCDEF" }"""
    user_data = connected_users.get(request.sid)
    if not user_data:
        return

    code = data.get("room_code", "").upper()
    room = Room.find_by_code(code)
    if not room:
        emit("error", {"message": "Room not found"})
        return

    username = user_data["username"]
    avatar_color = user_data["avatar_color"]

    join_room(code)
    connected_users[request.sid]["room"] = code
    Room.add_member(code, username)

    # system message: user joined
    sys_msg = Message.create(
        room_id=code,
        username="system",
        avatar_color="#6b7280",
        text=f"{username} joined the room",
        msg_type="system"
    )
    emit("message", Message.to_public(sys_msg), to=code)
    emit("room_members", _get_members(code), to=code)

    # confirm to the joining client
    emit("joined", {"room_code": code})


@socketio.on("leave_room")
def on_leave_room(data):
    user_data = connected_users.get(request.sid)
    if not user_data:
        return

    code = data.get("room_code", "").upper()
    username = user_data["username"]

    leave_room(code)
    connected_users[request.sid]["room"] = None
    Room.remove_member(code, username)

    sys_msg = Message.create(
        room_id=code,
        username="system",
        avatar_color="#6b7280",
        text=f"{username} left the room",
        msg_type="system"
    )
    emit("message", Message.to_public(sys_msg), to=code)
    emit("room_members", _get_members(code), to=code)


@socketio.on("send_message")
def on_send_message(data):
    """Client sends: { room_code: "ABCDEF", text: "hello" }"""
    user_data = connected_users.get(request.sid)
    if not user_data:
        return

    code = data.get("room_code", "").upper()
    text = data.get("text", "").strip()

    if not text or not code:
        return

    msg = Message.create(
        room_id=code,
        username=user_data["username"],
        avatar_color=user_data["avatar_color"],
        text=text,
    )
    emit("message", Message.to_public(msg), to=code)


@socketio.on("typing")
def on_typing(data):
    """Broadcast typing indicator to everyone else in the room."""
    user_data = connected_users.get(request.sid)
    if not user_data or not user_data["room"]:
        return
    emit(
        "user_typing",
        {"username": user_data["username"]},
        to=user_data["room"],
        include_self=False
    )


@socketio.on("stop_typing")
def on_stop_typing(data):
    user_data = connected_users.get(request.sid)
    if not user_data or not user_data["room"]:
        return
    emit(
        "user_stop_typing",
        {"username": user_data["username"]},
        to=user_data["room"],
        include_self=False
    )


def _get_members(room_code: str) -> dict:
    """Helper to get current member list for a room."""
    room = Room.find_by_code(room_code)
    return {"members": room.get("members", []) if room else []}
