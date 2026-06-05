import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/livechat")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    JWT_ACCESS_TOKEN_EXPIRES = False  # tokens don't expire (fine for dev)

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig
}
