from app.database import db
from app.models.user import User, AnalysisHistory  # Impor model-model yang perlu dibuat tabelnya

def create_tables(app):
    """Create all database tables"""
    with app.app_context():
        # Cek apakah tabel sudah ada
        db.create_all()
        print("Database tables created.")