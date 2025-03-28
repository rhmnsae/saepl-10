from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from datetime import datetime
from app.database import db, login_manager

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=False)
    full_name = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    # For storing user settings or preferences (as JSON)
    settings = db.Column(db.Text)
    
    # Define relationship to analysis history
    analysis_history = db.relationship('AnalysisHistory', backref='user', lazy='dynamic')
    
    @property
    def password(self):
        """Password is not a readable attribute"""
        raise AttributeError('password is not a readable attribute')
        
    @password.setter
    def password(self, password):
        """Set password hash"""
        self.password_hash = generate_password_hash(password)
        
    def verify_password(self, password):
        """Verify password against stored hash"""
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'

class AnalysisHistory(db.Model):
    __tablename__ = 'analysis_history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    file_path = db.Column(db.String(255))
    result_path = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Summary statistics
    total_tweets = db.Column(db.Integer)
    positive_count = db.Column(db.Integer)
    neutral_count = db.Column(db.Integer)
    negative_count = db.Column(db.Integer)
    
    def __repr__(self):
        return f'<Analysis {self.title}>'