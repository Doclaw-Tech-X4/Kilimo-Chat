"""
KilimoChat Authentication API Routes
FastAPI endpoints for user authentication, registration, and password management.
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Request
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, EmailStr, validator
from typing import Optional

import auth_handler
from database_auth import (
    create_auth_user, get_auth_user_by_phone, get_auth_user_by_email,
    get_auth_user_by_id, update_verification_code, verify_email_code,
    set_password_reset_token, verify_reset_token, reset_password,
    update_last_login, update_user_profile
)
from config import logger

# Create router
auth_router = APIRouter(prefix="/api/auth", tags=["authentication"])


# ============ Pydantic Models ============

class RegisterRequest(BaseModel):
    phone_number: str
    full_name: str
    email: EmailStr
    password: str
    confirm_password: str
    
    @validator('phone_number')
    def validate_phone(cls, v):
        is_valid, error = auth_handler.validate_phone_number(v)
        if not is_valid:
            raise ValueError(error)
        return v
    
    @validator('password')
    def validate_password_strength(cls, v):
        is_valid, error = auth_handler.validate_password(v)
        if not is_valid:
            raise ValueError(error)
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v


class VerifyEmailRequest(BaseModel):
    user_id: str
    code: str


class LoginRequest(BaseModel):
    phone_number: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str
    
    @validator('new_password')
    def validate_password_strength(cls, v):
        is_valid, error = auth_handler.validate_password(v)
        if not is_valid:
            raise ValueError(error)
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    profile_picture: Optional[str] = None
    preferred_language: Optional[str] = None


class GoogleAuthRequest(BaseModel):
    token: str  # Google ID token


# ============ Dependencies ============

async def get_current_user(authorization: Optional[str] = Header(None)):
    """Dependency to get current authenticated user from JWT token."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    # Extract token from "Bearer <token>"
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header format")
    
    token = parts[1]
    payload = auth_handler.verify_jwt_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user = get_auth_user_by_id(payload.get("user_id"))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user


# ============ Routes ============

@auth_router.post("/register", response_model=dict)
async def register(request: RegisterRequest):
    """
    Register a new user with phone, email, and password.
    Sends verification email with 6-digit code.
    """
    try:
        # Check if user already exists
        existing_phone = get_auth_user_by_phone(request.phone_number)
        if existing_phone:
            raise HTTPException(status_code=400, detail="Phone number already registered")
        
        existing_email = get_auth_user_by_email(request.email)
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Hash password
        password_hash = auth_handler.hash_password(request.password)
        
        # Create user
        success, message, user_id = create_auth_user(
            phone_number=request.phone_number,
            full_name=request.full_name,
            email=request.email,
            password_hash=password_hash
        )
        
        if not success:
            raise HTTPException(status_code=400, detail=message)
        
        # Generate and send verification code
        verification_code = auth_handler.generate_verification_code()
        update_verification_code(user_id, verification_code)
        
        # Send verification email
        email_sent = auth_handler.send_verification_email(
            request.email, verification_code, request.full_name
        )
        
        if not email_sent:
            logger.warning(f"Failed to send verification email to {request.email}")
        
        return {
            "success": True,
            "message": "Registration successful. Please check your email for verification code.",
            "user_id": user_id,
            "email_sent": email_sent
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")


@auth_router.post("/verify-email", response_model=dict)
async def verify_email(request: VerifyEmailRequest):
    """Verify email with 6-digit code."""
    try:
        success = verify_email_code(request.user_id, request.code)
        
        if not success:
            raise HTTPException(status_code=400, detail="Invalid or expired verification code")
        
        return {
            "success": True,
            "message": "Email verified successfully. You can now log in."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verification error: {e}")
        raise HTTPException(status_code=500, detail="Verification failed")


@auth_router.post("/resend-verification", response_model=dict)
async def resend_verification(user_id: str):
    """Resend verification email."""
    try:
        user = get_auth_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if user.get("is_verified"):
            raise HTTPException(status_code=400, detail="Email already verified")
        
        # Generate new code
        verification_code = auth_handler.generate_verification_code()
        update_verification_code(user_id, verification_code)
        
        # Send email
        email_sent = auth_handler.send_verification_email(
            user["email"], verification_code, user["full_name"]
        )
        
        return {
            "success": email_sent,
            "message": "Verification email sent" if email_sent else "Failed to send email"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resend verification error: {e}")
        raise HTTPException(status_code=500, detail="Failed to resend verification")


@auth_router.post("/login", response_model=dict)
async def login(request: LoginRequest):
    """
    Login with phone number and password.
    Returns JWT token on success.
    """
    try:
        # Get user by phone
        user = get_auth_user_by_phone(request.phone_number)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid phone number or password")
        
        # Check if email is verified
        if not user.get("is_verified"):
            raise HTTPException(
                status_code=403, 
                detail="Email not verified. Please check your email for verification code.",
                headers={"X-User-ID": user["_id"]}  # Return user ID for resending
            )
        
        # Verify password
        if not auth_handler.verify_password(request.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid phone number or password")
        
        # Update last login
        update_last_login(user["_id"])
        
        # Generate JWT token
        token = auth_handler.create_jwt_token(
            user_id=user["_id"],
            phone_number=user["phone_number"],
            email=user["email"]
        )
        
        return {
            "success": True,
            "message": "Login successful",
            "token": token,
            "user": {
                "id": user["_id"],
                "phone_number": user["phone_number"],
                "full_name": user["full_name"],
                "email": user["email"],
                "profile_picture": user.get("profile_picture"),
                "preferred_language": user.get("preferred_language", "en")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")


@auth_router.post("/forgot-password", response_model=dict)
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset email."""
    try:
        user = get_auth_user_by_email(request.email)
        if not user:
            # Don't reveal if email exists
            return {
                "success": True,
                "message": "If this email is registered, you will receive a password reset link."
            }
        
        # Generate reset token
        reset_token = auth_handler.generate_reset_token()
        set_password_reset_token(user["_id"], reset_token)
        
        # Send reset email
        email_sent = auth_handler.send_password_reset_email(
            request.email, reset_token, user["full_name"]
        )
        
        return {
            "success": email_sent,
            "message": "If this email is registered, you will receive a password reset link."
        }
        
    except Exception as e:
        logger.error(f"Forgot password error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process request")


@auth_router.post("/reset-password", response_model=dict)
async def reset_password_endpoint(request: ResetPasswordRequest):
    """Reset password with token."""
    try:
        # Verify token
        user_id = verify_reset_token(request.token)
        if not user_id:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
        # Hash new password
        password_hash = auth_handler.hash_password(request.new_password)
        
        # Reset password
        success = reset_password(user_id, password_hash)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to reset password")
        
        return {
            "success": True,
            "message": "Password reset successfully. Please log in with your new password."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset password")


@auth_router.get("/me", response_model=dict)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user info."""
    return {
        "success": True,
        "user": {
            "id": current_user["_id"],
            "phone_number": current_user["phone_number"],
            "full_name": current_user["full_name"],
            "email": current_user["email"],
            "profile_picture": current_user.get("profile_picture"),
            "is_verified": current_user["is_verified"],
            "preferred_language": current_user.get("preferred_language", "en"),
            "created_at": current_user.get("created_at"),
            "last_login": current_user.get("last_login")
        }
    }


@auth_router.put("/profile", response_model=dict)
async def update_profile(
    request: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update user profile."""
    try:
        updates = {}
        if request.full_name:
            updates["full_name"] = request.full_name
        if request.profile_picture:
            updates["profile_picture"] = request.profile_picture
        if request.preferred_language:
            updates["preferred_language"] = request.preferred_language
        
        success = update_user_profile(current_user["_id"], updates)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to update profile")
        
        return {
            "success": True,
            "message": "Profile updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update profile error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile")


@auth_router.post("/logout", response_model=dict)
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout (client should discard token)."""
    return {
        "success": True,
        "message": "Logged out successfully"
    }


# ============ Google OAuth Routes ============

@auth_router.get("/google")
async def google_auth():
    """Initiate Google OAuth flow."""
    from google_auth_oauthlib.flow import Flow
    
    client_config = {
        "web": {
            "client_id": auth_handler.GOOGLE_CLIENT_ID,
            "client_secret": auth_handler.GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [auth_handler.GOOGLE_REDIRECT_URI]
        }
    }
    
    flow = Flow.from_client_config(
        client_config,
        scopes=["openid", "email", "profile"]
    )
    flow.redirect_uri = auth_handler.GOOGLE_REDIRECT_URI
    
    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true"
    )
    
    return RedirectResponse(authorization_url)


@auth_router.get("/google/callback")
async def google_callback(request: Request):
    """Handle Google OAuth callback."""
    try:
        from google_auth_oauthlib.flow import Flow
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        
        # Exchange code for tokens
        code = request.query_params.get("code")
        if not code:
            raise HTTPException(status_code=400, detail="Authorization code not provided")
        
        # Verify ID token
        idinfo = id_token.verify_oauth2_token(
            code, google_requests.Request(), auth_handler.GOOGLE_CLIENT_ID
        )
        
        google_id = idinfo["sub"]
        email = idinfo.get("email")
        name = idinfo.get("name", "")
        picture = idinfo.get("picture")
        
        # Check if user exists
        user = get_auth_user_by_google_id(google_id)
        
        if not user:
            # Check if email exists (link accounts)
            existing_email = get_auth_user_by_email(email)
            if existing_email:
                # Link Google to existing account
                from database_auth import db
                if db:
                    db.auth_users.update_one(
                        {"_id": existing_email["_id"]},
                        {
                            "$set": {
                                "google_id": google_id,
                                "profile_picture": picture,
                                "updated_at": auth_handler.datetime.utcnow()
                            }
                        }
                    )
                user = existing_email
            else:
                # Create new Google user
                # Generate placeholder phone
                phone_placeholder = f"google_{google_id[:10]}"
                success, message, user_id = create_auth_user(
                    phone_number=phone_placeholder,
                    full_name=name,
                    email=email,
                    password_hash="",  # No password for OAuth users
                    google_id=google_id,
                    profile_picture=picture
                )
                
                if not success:
                    raise HTTPException(status_code=400, detail=message)
                
                user = get_auth_user_by_id(user_id)
        
        # Update last login
        update_last_login(user["_id"])
        
        # Generate JWT
        token = auth_handler.create_jwt_token(
            user_id=user["_id"],
            phone_number=user.get("phone_number", ""),
            email=user["email"]
        )
        
        # Redirect to frontend with token
        frontend_url = auth_handler.os.getenv("FRONTEND_URL", "http://localhost:3000")
        redirect_url = f"{frontend_url}/auth/callback?token={token}&success=true"
        
        return RedirectResponse(redirect_url)
        
    except Exception as e:
        logger.error(f"Google auth error: {e}")
        frontend_url = auth_handler.os.getenv("FRONTEND_URL", "http://localhost:3000")
        return RedirectResponse(f"{frontend_url}/login?error=google_auth_failed")
