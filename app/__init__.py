import os
import nltk
from flask import Flask, send_from_directory
from flask_session import Session
from app.database import init_app as init_db
from flask_login import current_user

def create_app(config_file=None):
    # Inisialisasi aplikasi Flask
    app = Flask(__name__)
    
    # Konfigurasi dari file
    if config_file:
        app.config.from_pyfile(config_file)
    else:
        app.config.from_object('config.Config')
    
    # Pastikan direktori yang diperlukan ada
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['SESSION_FILE_DIR'], exist_ok=True)
    os.makedirs(app.config['MODEL_FOLDER'], exist_ok=True)
    
    # Setup session
    Session(app)
    
    # Setup database
    from app.database import init_app as init_db
    init_db(app)
    
    # Import model terlebih dahulu agar SQLAlchemy mengetahui tabel apa yang harus dibuat
    from app.models.user import User, AnalysisHistory
    
    # Buat tabel-tabel database
    from app.initialize_db import create_tables
    create_tables(app)
    
    # Download NLTK resources
    try:
        nltk.data.find('corpora/stopwords')
    except LookupError:
        nltk.download('stopwords')

    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt')
    
    # Import dan register blueprint
    from app.routes.main_routes import main_bp
    from app.routes.analysis_routes import analysis_bp
    from app.routes.chatbot_routes import chatbot_bp
    from app.routes.auth_routes import auth_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(analysis_bp)
    app.register_blueprint(chatbot_bp)
    app.register_blueprint(auth_bp, url_prefix='/auth')  # Tambahkan prefix untuk auth routes
    
    # Membuat konteks template global
    @app.context_processor
    def inject_user():
        return {'current_user': current_user}
    
    # Jika dalam mode development, tambahkan route untuk static files
    if app.config['DEBUG']:
        @app.route('/uploads/<path:filename>')
        def uploaded_file(filename):
            return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    return app