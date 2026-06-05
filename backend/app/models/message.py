from datetime import datetime, timezone
from ..extensions import db


class Message:
    """
    Schema:
        _id         : ObjectId
        room_id     : str (room code)
        username    : str
        avatar_color: str
        text        : str
        type        : str ("message" | "system")
        created_at  : datetime
    """

    @staticmethod
    def create(room_id: str, username: str, avatar_color: str, text: str, msg_type="message") -> dict:
        message = {
            "room_id": room_id,
            "username": username,
            "avatar_color": avatar_color,
            "text": text,
            "type": msg_type,
            "created_at": datetime.now(timezone.utc),
        }
        result = db.messages.insert_one(message)
        message["_id"] = str(result.inserted_id)
        return message

    @staticmethod
    def get_by_room(room_id: str, limit=50) -> list[dict]:
        """Fetch last `limit` messages for a room, oldest first."""
        messages = list(
            db.messages.find({"room_id": room_id})
            .sort("created_at", -1)
            .limit(limit)
        )
        messages.reverse()  # oldest first for display
        for m in messages:
            m["_id"] = str(m["_id"])
        return messages

    @staticmethod
    def to_public(msg: dict) -> dict:
        return {
            "id": str(msg["_id"]),
            "room_id": msg["room_id"],
            "username": msg["username"],
            "avatar_color": msg["avatar_color"],
            "text": msg["text"],
            "type": msg["type"],
            "created_at": msg["created_at"].isoformat() if hasattr(msg["created_at"], "isoformat") else msg["created_at"],
        }
