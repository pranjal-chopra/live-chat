from datetime import datetime, timezone
from ..extensions import db, bcrypt


class User:
    """
    Represents a user document in MongoDB.
    Schema:
        _id        : ObjectId (auto by MongoDB)
        username   : str (unique)
        password   : str (bcrypt hash — never store plain text)
        avatar_color: str (random hex for UI avatar)
        created_at : datetime
    """

    @staticmethod
    def create(username: str, password: str, avatar_color: str) -> dict:
        """Hash password and insert user. Returns inserted doc."""
        hashed = bcrypt.generate_password_hash(password).decode("utf-8")
        user = {
            "username": username,
            "password": hashed,
            "avatar_color": avatar_color,
            "created_at": datetime.now(timezone.utc),
        }
        result = db.users.insert_one(user)
        user["_id"] = str(result.inserted_id)
        return user

    @staticmethod
    def find_by_username(username: str) -> dict | None:
        return db.users.find_one({"username": username})

    @staticmethod
    def check_password(hashed: str, plain: str) -> bool:
        return bcrypt.check_password_hash(hashed, plain)

    @staticmethod
    def to_public(user: dict) -> dict:
        """Strip sensitive fields before sending to frontend."""
        return {
            "id": str(user["_id"]),
            "username": user["username"],
            "avatar_color": user["avatar_color"],
        }
