from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from pymongo.errors import DuplicateKeyError
import random

from ..models.user import User

auth_bp = Blueprint("auth", __name__)

# a palette of avatar colors — one gets picked randomly on register
AVATAR_COLORS = [
    "#ef4444", "#f97316", "#eab308", "#22c55e",
    "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
]


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    try:
        avatar_color = random.choice(AVATAR_COLORS)
        user = User.create(username, password, avatar_color)
        token = create_access_token(identity=username)
        return jsonify({
            "token": token,
            "user": User.to_public(user)
        }), 201

    except DuplicateKeyError:
        return jsonify({"error": "Username already taken"}), 409


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "")

    user = User.find_by_username(username)
    if not user or not User.check_password(user["password"], password):
        return jsonify({"error": "Invalid username or password"}), 401

    token = create_access_token(identity=username)
    return jsonify({
        "token": token,
        "user": User.to_public(user)
    }), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()  # this decorator checks the JWT token in the Authorization header
def me():
    username = get_jwt_identity()
    user = User.find_by_username(username)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": User.to_public(user)}), 200
