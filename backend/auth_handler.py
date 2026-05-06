"""
KilimoChat Authentication Handler
Handles user registration, login, email verification, password reset, and JWT tokens.
"""

import os
import re
import uuid
import bcrypt
import jwt
import random
import string
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib

from config import logger

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24

# Email Configuration
EMAIL_SERVICE = os.getenv("EMAIL_SERVICE", "smtp")  # smtp, sendgrid
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "noreply@kilimochat.com")

# Google OAuth
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:3000/auth/callback")

# Password requirements
MIN_PASSWORD_LENGTH = 8
REQUIRE_UPPERCASE = True
REQUIRE_LOWERCASE = True
REQUIRE_DIGIT = True
REQUIRE_SPECIAL = True


@dataclass
class AuthUser:
    """Data class for authenticated user."""
    id: str
    phone_number: str
    full_name: str
    email: str
    is_verified: bool
    profile_picture: Optional[str] = None
    google_id: Optional[str] = None
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None


def validate_password(password: str) -> Tuple[bool, str]:
    """
    Validate password meets minimum requirements.
    Returns (is_valid, error_message)
    """
    if len(password) < MIN_PASSWORD_LENGTH:
        return False, f"Password must be at least {MIN_PASSWORD_LENGTH} characters long"
    
    if REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if REQUIRE_DIGIT and not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    
    if REQUIRE_SPECIAL and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character (!@#$%^&* etc.)"
    
    return True, ""


def validate_phone_number(phone: str) -> Tuple[bool, str]:
    """Validate phone number format (Kenyan format)."""
    # Remove spaces and dashes
    phone = re.sub(r'[\s\-]', '', phone)
    
    # Kenyan format: +2547XXXXXXXX or 07XXXXXXXX or 7XXXXXXXX
    if phone.startswith('+254'):
        if len(phone) == 13 and phone[4:].isdigit():
            return True, ""
    elif phone.startswith('07'):
        if len(phone) == 10 and phone.isdigit():
            return True, ""
    elif phone.startswith('7') and len(phone) == 9:
        return True, ""
    
    return False, "Invalid phone number. Use format: +2547XXXXXXXX or 07XXXXXXXX"


def format_phone_number(phone: str) -> str:
    """Normalize phone number to +254 format."""
    phone = re.sub(r'[\s\-]', '', phone)
    if phone.startswith('07'):
        return '+254' + phone[1:]
    elif phone.startswith('7') and len(phone) == 9:
        return '+254' + phone
    return phone


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash."""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def generate_verification_code() -> str:
    """Generate 6-digit verification code."""
    return ''.join(random.choices(string.digits, k=6))


def generate_reset_token() -> str:
    """Generate secure reset token."""
    return uuid.uuid4().hex


def create_jwt_token(user_id: str, phone_number: str, email: str) -> str:
    """Create JWT access token."""
    payload = {
        "user_id": user_id,
        "phone_number": phone_number,
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS),
        "iat": datetime.utcnow(),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify and decode JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def send_verification_email(email: str, code: str, full_name: str) -> bool:
    """Send verification email with 6-digit code."""
    try:
        subject = "Verify Your KilimoChat Account"
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #2c5f2d;">Welcome to KilimoChat, {full_name}!</h2>
                <p>Thank you for registering. Please verify your email address by entering the following code:</p>
                <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
                    <h1 style="color: #2c5f2d; font-size: 36px; letter-spacing: 10px; margin: 0;">{code}</h1>
                </div>
                <p>This code will expire in 30 minutes.</p>
                <p>If you didn't create this account, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                <p style="font-size: 12px; color: #666;">
                    KilimoChat - Your AI Agricultural Assistant<br>
                    This is an automated message, please do not reply.
                </p>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Welcome to KilimoChat, {full_name}!
        
        Your verification code is: {code}
        
        This code will expire in 30 minutes.
        
        If you didn't create this account, please ignore this email.
        """
        
        return send_email(email, subject, text_body, html_body)
        
    except Exception as e:
        logger.error(f"Failed to send verification email: {e}")
        return False


def send_password_reset_email(email: str, token: str, full_name: str) -> bool:
    """Send password reset email with token."""
    try:
        # In production, this would be a frontend URL
        reset_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token={token}"
        
        subject = "Reset Your KilimoChat Password"
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #2c5f2d;">Password Reset Request</h2>
                <p>Hello {full_name},</p>
                <p>We received a request to reset your password. Click the button below to reset it:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" style="background: #2c5f2d; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
                </div>
                <p>Or copy and paste this link in your browser:</p>
                <p style="word-break: break-all; color: #0066cc;">{reset_url}</p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                <p style="font-size: 12px; color: #666;">
                    KilimoChat - Your AI Agricultural Assistant<br>
                    This is an automated message, please do not reply.
                </p>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Password Reset Request
        
        Hello {full_name},
        
        We received a request to reset your password. Visit this link to reset it:
        {reset_url}
        
        This link will expire in 1 hour.
        
        If you didn't request this, please ignore this email.
        """
        
        return send_email(email, subject, text_body, html_body)
        
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
        return False


def send_email(to_email: str, subject: str, text_body: str, html_body: str) -> bool:
    """Send email using SMTP or configured service."""
    try:
        if EMAIL_SERVICE == "smtp":
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = EMAIL_FROM
            msg['To'] = to_email
            
            part1 = MIMEText(text_body, 'plain')
            part2 = MIMEText(html_body, 'html')
            
            msg.attach(part1)
            msg.attach(part2)
            
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(EMAIL_FROM, to_email, msg.as_string())
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        elif EMAIL_SERVICE == "sendgrid":
            # Implement SendGrid if needed
            # Requires: pip install sendgrid
            logger.info("SendGrid not implemented, using SMTP")
            return False
            
        else:
            logger.error(f"Unknown email service: {EMAIL_SERVICE}")
            return False
            
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False


def validate_email(email: str) -> bool:
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None
