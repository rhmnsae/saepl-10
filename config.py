import os

class Config:
    SECRET_KEY = 'analisis_sentimen_X'
    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
    MODEL_FOLDER = os.path.join(os.getcwd(), 'models')
    SESSION_TYPE = 'filesystem'
    SESSION_FILE_DIR = os.path.join(os.getcwd(), 'flask_sessions')
    SESSION_PERMANENT = False
    SESSION_USE_SIGNER = True
    MODEL_PATH = os.path.join(MODEL_FOLDER, 'indobert_sentiment_best.pt')
    GEMINI_API_KEY = "AIzaSyCYPhQCDxpyz_MmR86v43XgKvMryx5FfQY"
    
    # Database configuration
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(os.getcwd(), 'app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Additional security settings
    WTF_CSRF_ENABLED = True