from flask_socketio import SocketIO
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from pymongo import MongoClient

socketio = SocketIO()
jwt = JWTManager()
bcrypt = Bcrypt()

# mongo client — initialized in create_app
mongo_client = None
db = None

def init_db(app):
    global mongo_client, db
    mongo_client = MongoClient(app.config["MONGO_URI"])
    db = mongo_client.get_default_database()

    # indexes for fast queries
    db.messages.create_index([("room_id", 1), ("created_at", 1)])
    db.users.create_index("username", unique=True)
    db.rooms.create_index("code", unique=True)

    return db
