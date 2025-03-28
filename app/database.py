from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager

# Initialize SQLAlchemy
db = SQLAlchemy()

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.login_view = 'auth.login'
login_manager.login_message = 'Silakan login untuk mengakses halaman ini.'
login_manager.login_message_category = 'warning'

def init_app(app):
    """Initialize database and login manager with the Flask app"""
    db.init_app(app)
    login_manager.init_app(app)