from datetime import datetime, timezone
import random
import string
from ..extensions import db


def _generate_code(length=6) -> str:
    """Generate a unique uppercase room code."""
    while True:
        code = "".join(random.choices(string.ascii_uppercase, k=length))
        if not db.rooms.find_one({"code": code}):
            return code


class Room:
    """
    Schema:
        _id         : ObjectId
        code        : str (unique, e.g. "ABCDEF")
        name        : str (display name)
        created_by  : str (username)
        members     : list[str] (currently connected usernames)
        created_at  : datetime
    """

    @staticmethod
    def create(name: str, created_by: str) -> dict:
        room = {
            "code": _generate_code(),
            "name": name,
            "created_by": created_by,
            "members": [],
            "created_at": datetime.now(timezone.utc),
        }
        result = db.rooms.insert_one(room)
        room["_id"] = str(result.inserted_id)
        return room

    @staticmethod
    def find_by_code(code: str) -> dict | None:
        return db.rooms.find_one({"code": code})

    @staticmethod
    def get_rooms_for_user(username: str) -> list[dict]:
        """Only return rooms this user has previously joined."""
        rooms = list(db.rooms.find({"members": username}).sort("created_at", -1))
        for r in rooms:
            r["_id"] = str(r["_id"])
        return rooms

    @staticmethod
    def add_member(code: str, username: str):
        db.rooms.update_one(
            {"code": code},
            {"$addToSet": {"members": username}}  # addToSet = no duplicates
        )

    @staticmethod
    def remove_member(code: str, username: str):
        db.rooms.update_one(
            {"code": code},
            {"$pull": {"members": username}}
        )

    @staticmethod
    def to_public(room: dict) -> dict:
        return {
            "id": str(room["_id"]),
            "code": room["code"],
            "name": room["name"],
            "created_by": room["created_by"],
            "members": room.get("members", []),
            "created_at": room["created_at"].isoformat(),
        }
