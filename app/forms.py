from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, SubmitField
from wtforms.validators import DataRequired, Length, Email, EqualTo, ValidationError
from app.models.user import User

class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    remember_me = BooleanField('Ingat Saya')
    submit = SubmitField('Login')

class RegistrationForm(FlaskForm):
    username = StringField('Username', validators=[
        DataRequired(), 
        Length(min=3, max=64)
    ])
    email = StringField('Email', validators=[
        DataRequired(), 
        Email()
    ])
    full_name = StringField('Nama Lengkap', validators=[
        DataRequired(),
        Length(min=3, max=100)
    ])
    password = PasswordField('Password', validators=[
        DataRequired(),
        Length(min=8, message='Password harus memiliki minimal 8 karakter')
    ])
    password2 = PasswordField(
        'Konfirmasi Password', 
        validators=[
            DataRequired(),
            EqualTo('password', message='Password harus sama')
        ]
    )
    submit = SubmitField('Register')
    
    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user is not None:
            raise ValidationError('Username sudah digunakan, silakan gunakan username lain.')
    
    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user is not None:
            raise ValidationError('Email sudah terdaftar, silakan gunakan email lain.')