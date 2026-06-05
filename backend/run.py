from gevent import monkey
monkey.patch_all()  # must be first

from app import create_app
from app.extensions import socketio

app = create_app("development")

if __name__ == "__main__":
    from gevent.pywsgi import WSGIServer
    from geventwebsocket.handler import WebSocketHandler
    server = WSGIServer(("0.0.0.0", 5000), app, handler_class=WebSocketHandler)
    print("Server running on http://0.0.0.0:5000")
    server.serve_forever()