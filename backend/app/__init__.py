from flask import Flask
from flask_cors import CORS
from .config import config
from .extensions import socketio, jwt, bcrypt, init_db


def create_app(config_name="default"):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # allow React dev server to talk to Flask
    CORS(app, origins=[app.config["FRONTEND_URL"]], supports_credentials=True)

    # init extensions
    socketio.init_app(
        app,
        cors_allowed_origins=app.config["FRONTEND_URL"],
        async_mode="eventlet"
    )
    jwt.init_app(app)
    bcrypt.init_app(app)
    init_db(app)

    # register blueprints (route groups)
    from .routes.auth import auth_bp
    from .routes.rooms import rooms_bp
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(rooms_bp, url_prefix="/api/rooms")

    # register socket events
    from .sockets import events  # noqa — importing registers the handlers

    return app
