from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..models.room import Room
from ..models.message import Message

rooms_bp = Blueprint("rooms", __name__)



@rooms_bp.route("/", methods=["GET"])
@jwt_required()
def get_rooms():
    username = get_jwt_identity()
    rooms = Room.get_rooms_for_user(username)
    return jsonify({"rooms": [Room.to_public(r) for r in rooms]}), 200


@rooms_bp.route("/", methods=["POST"])
@jwt_required()
def create_room():
    """Create a new room."""
    username = get_jwt_identity()
    data = request.get_json()
    name = data.get("name", "").strip()

    if not name:
        return jsonify({"error": "Room name is required"}), 400

    room = Room.create(name=name, created_by=username)
    return jsonify({"room": Room.to_public(room)}), 201


@rooms_bp.route("/<code>", methods=["GET"])
@jwt_required()
def get_room(code):
    """Get a single room by code."""
    room = Room.find_by_code(code.upper())
    if not room:
        return jsonify({"error": "Room not found"}), 404
    return jsonify({"room": Room.to_public(room)}), 200


@rooms_bp.route("/<code>/messages", methods=["GET"])
@jwt_required()
def get_messages(code):
    """Fetch message history for a room."""
    room = Room.find_by_code(code.upper())
    if not room:
        return jsonify({"error": "Room not found"}), 404

    messages = Message.get_by_room(code.upper())
    return jsonify({"messages": [Message.to_public(m) for m in messages]}), 200
