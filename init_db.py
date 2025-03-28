"""
Script untuk menginisialisasi database
Jalankan sekali untuk membuat tabel-tabel: python init_db.py
"""
from app import create_app
from app.database import db
from app.models.user import User, AnalysisHistory

app = create_app()

with app.app_context():
    print("Membuat tabel database...")
    db.create_all()  # Buat ulang tabel
    print("Inisialisasi database selesai!")