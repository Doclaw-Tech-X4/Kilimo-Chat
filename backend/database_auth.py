"""
KilimoChat Authentication Database Module
Extended MongoDB collections for user authentication and file storage.
"""

import uuid
import io
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, BinaryIO, Tuple
from dataclasses import dataclass

from pymongo import ASCENDING, DESCENDING
from pymongo.collection import Collection
from pymongo.errors import DuplicateKeyError
import gridfs

from database_mongo import mongo_client, db, logger
from auth_handler import AuthUser, format_phone_number


# GridFS for file storage
grid_fs = None
if db is not None:
    grid_fs = gridfs.GridFS(db)


@dataclass
class UserUpload:
    """Data class for user file uploads stored in MongoDB."""
    id: str
    user_id: str
    file_name: str
    file_type: str
    file_size: int
    analysis_result: Optional[Dict] = None
    uploaded_at: Optional[datetime] = None


def init_auth_collections():
    """Initialize authentication-related collections and indexes."""
    if db is None:
        logger.warning("MongoDB not connected, auth collections not initialized")
        return False
    
    try:
        # Auth users collection (extends existing users)
        auth_users: Collection = db.auth_users
        auth_users.create_index("phone_number", unique=True)
        auth_users.create_index("email", unique=True)
        auth_users.create_index("google_id", sparse=True)
        auth_users.create_index("verification_code")
        auth_users.create_index("reset_token")
        auth_users.create_index("created_at")
        
        # User profiles collection
        user_profiles: Collection = db.user_profiles
        user_profiles.create_index("user_id", unique=True)
        user_profiles.create_index("county")
        user_profiles.create_index("crop_types")
        user_profiles.create_index("updated_at")
        
        # User uploads collection metadata
        uploads_meta: Collection = db.uploads_metadata
        uploads_meta.create_index("user_id")
        uploads_meta.create_index("uploaded_at")
        uploads_meta.create_index([("user_id", ASCENDING), ("uploaded_at", DESCENDING)])
        
        # Verification codes collection
        verifications: Collection = db.verification_codes
        verifications.create_index("email", unique=True)
        verifications.create_index("expires_at", expireAfterSeconds=0)  # TTL index
        
        logger.info("✅ Auth collections initialized")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize auth collections: {e}")
        return False


def create_auth_user(phone_number: str, full_name: str, email: str, 
                    password_hash: str, google_id: Optional[str] = None,
                    profile_picture: Optional[str] = None) -> Tuple[bool, str, Optional[str]]:
    """
    Create new authenticated user.
    Returns: (success, message, user_id)
    """
    if db is None:
        return False, "Database not connected", None
    
    try:
        # Normalize phone number
        phone_number = format_phone_number(phone_number)
        
        # Check for existing user
        auth_users: Collection = db.auth_users
        existing = auth_users.find_one({
            "$or": [
                {"phone_number": phone_number},
                {"email": email.lower()}
            ]
        })
        
        if existing:
            if existing.get("phone_number") == phone_number:
                return False, "Phone number already registered", None
            if existing.get("email") == email.lower():
                return False, "Email already registered", None
        
        user_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        user_doc = {
            "_id": user_id,
            "id": user_id,
            "phone_number": phone_number,
            "full_name": full_name,
            "email": email.lower(),
            "password_hash": password_hash,
            "is_verified": False if not google_id else True,  # Google users are pre-verified
            "verification_code": None,
            "verification_expires": None,
            "google_id": google_id,
            "profile_picture": profile_picture,
            "reset_token": None,
            "reset_token_expires": None,
            "preferred_language": "en",
            "message_count": 0,
            "created_at": now,
            "last_login": None,
            "updated_at": now
        }
        
        auth_users.insert_one(user_doc)
        
        # Also create in old users collection for backward compatibility
        try:
            from database_mongo import get_or_create_user
            get_or_create_user(phone_number, "en")
        except:
            pass
        
        logger.info(f"Created auth user: {user_id} - {email}")
        return True, "User created successfully", user_id
        
    except DuplicateKeyError as e:
        logger.error(f"Duplicate key error: {e}")
        return False, "User already exists", None
    except Exception as e:
        logger.error(f"Failed to create user: {e}")
        return False, str(e), None


def get_auth_user_by_phone(phone_number: str) -> Optional[Dict]:
    """Get user by phone number."""
    if db is None:
        return None
    
    phone_number = format_phone_number(phone_number)
    auth_users: Collection = db.auth_users
    return auth_users.find_one({"phone_number": phone_number})


def get_auth_user_by_email(email: str) -> Optional[Dict]:
    """Get user by email."""
    if db is None:
        return None
    
    auth_users: Collection = db.auth_users
    return auth_users.find_one({"email": email.lower()})


def get_auth_user_by_id(user_id: str) -> Optional[Dict]:
    """Get user by ID."""
    if db is None:
        return None
    
    auth_users: Collection = db.auth_users
    return auth_users.find_one({"_id": user_id})


def get_auth_user_by_google_id(google_id: str) -> Optional[Dict]:
    """Get user by Google ID."""
    if db is None:
        return None
    
    auth_users: Collection = db.auth_users
    return auth_users.find_one({"google_id": google_id})


def update_verification_code(user_id: str, code: str) -> bool:
    """Set email verification code for user."""
    if db is None:
        return False
    
    try:
        auth_users: Collection = db.auth_users
        expires = datetime.utcnow() + timedelta(minutes=30)
        
        result = auth_users.update_one(
            {"_id": user_id},
            {
                "$set": {
                    "verification_code": code,
                    "verification_expires": expires,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return result.modified_count > 0
        
    except Exception as e:
        logger.error(f"Failed to update verification code: {e}")
        return False


def verify_email_code(user_id: str, code: str) -> bool:
    """Verify email verification code."""
    if db is None:
        return False
    
    try:
        auth_users: Collection = db.auth_users
        user = auth_users.find_one({
            "_id": user_id,
            "verification_code": code,
            "verification_expires": {"$gt": datetime.utcnow()}
        })
        
        if not user:
            return False
        
        # Mark as verified and clear code
        auth_users.update_one(
            {"_id": user_id},
            {
                "$set": {
                    "is_verified": True,
                    "verification_code": None,
                    "verification_expires": None,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to verify email: {e}")
        return False


def set_password_reset_token(user_id: str, token: str) -> bool:
    """Set password reset token."""
    if db is None:
        return False
    
    try:
        auth_users: Collection = db.auth_users
        expires = datetime.utcnow() + timedelta(hours=1)
        
        result = auth_users.update_one(
            {"_id": user_id},
            {
                "$set": {
                    "reset_token": token,
                    "reset_token_expires": expires,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return result.modified_count > 0
        
    except Exception as e:
        logger.error(f"Failed to set reset token: {e}")
        return False


def verify_reset_token(token: str) -> Optional[str]:
    """Verify reset token and return user_id."""
    if db is None:
        return None
    
    try:
        auth_users: Collection = db.auth_users
        user = auth_users.find_one({
            "reset_token": token,
            "reset_token_expires": {"$gt": datetime.utcnow()}
        })
        
        return user["_id"] if user else None
        
    except Exception as e:
        logger.error(f"Failed to verify reset token: {e}")
        return None


def reset_password(user_id: str, new_password_hash: str) -> bool:
    """Reset user password."""
    if db is None:
        return False
    
    try:
        auth_users: Collection = db.auth_users
        result = auth_users.update_one(
            {"_id": user_id},
            {
                "$set": {
                    "password_hash": new_password_hash,
                    "reset_token": None,
                    "reset_token_expires": None,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return result.modified_count > 0
        
    except Exception as e:
        logger.error(f"Failed to reset password: {e}")
        return False


def update_last_login(user_id: str) -> bool:
    """Update user's last login time."""
    if db is None:
        return False
    
    try:
        auth_users: Collection = db.auth_users
        result = auth_users.update_one(
            {"_id": user_id},
            {
                "$set": {
                    "last_login": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0
    except Exception as e:
        logger.error(f"Failed to update last login: {e}")
        return False


def update_user_profile(user_id: str, updates: Dict[str, Any]) -> bool:
    """Update user profile fields."""
    if db is None:
        return False
    
    try:
        allowed_fields = ["full_name", "profile_picture", "preferred_language"]
        update_data = {k: v for k, v in updates.items() if k in allowed_fields}
        
        if not update_data:
            return False
        
        update_data["updated_at"] = datetime.utcnow()
        
        auth_users: Collection = db.auth_users
        result = auth_users.update_one(
            {"_id": user_id},
            {"$set": update_data}
        )
        
        return result.modified_count > 0
        
    except Exception as e:
        logger.error(f"Failed to update profile: {e}")
        return False


# ==================== FILE UPLOAD HANDLERS ====================

def save_user_file(user_id: str, file_data: bytes, filename: str, 
                   content_type: str, analysis_result: Optional[Dict] = None) -> Tuple[bool, str, Optional[str]]:
    """
    Save user file to MongoDB GridFS.
    Returns: (success, message, file_id)
    """
    if db is None or grid_fs is None:
        return False, "Database not connected", None
    
    try:
        # Store file in GridFS
        file_id = grid_fs.put(
            file_data,
            filename=filename,
            content_type=content_type,
            metadata={
                "user_id": user_id,
                "uploaded_at": datetime.utcnow()
            }
        )
        
        # Store metadata in separate collection
        uploads_meta: Collection = db.uploads_metadata
        upload_doc = {
            "_id": str(file_id),
            "file_id": str(file_id),
            "user_id": user_id,
            "file_name": filename,
            "file_type": content_type,
            "file_size": len(file_data),
            "analysis_result": analysis_result,
            "uploaded_at": datetime.utcnow()
        }
        uploads_meta.insert_one(upload_doc)
        
        logger.info(f"Saved file {filename} for user {user_id}")
        return True, "File saved successfully", str(file_id)
        
    except Exception as e:
        logger.error(f"Failed to save file: {e}")
        return False, str(e), None


def get_user_file(file_id: str) -> Optional[Dict]:
    """Get file metadata and data from GridFS."""
    if db is None or grid_fs is None:
        return None
    
    try:
        from bson.objectid import ObjectId
        
        file_obj = grid_fs.get(ObjectId(file_id))
        if not file_obj:
            return None
        
        return {
            "file_id": file_id,
            "filename": file_obj.filename,
            "content_type": file_obj.content_type,
            "data": file_obj.read(),
            "upload_date": file_obj.upload_date,
            "metadata": file_obj.metadata
        }
        
    except Exception as e:
        logger.error(f"Failed to get file: {e}")
        return None


def get_user_uploads(user_id: str, limit: int = 50) -> List[Dict]:
    """Get all uploads for a user."""
    if db is None:
        return []
    
    try:
        uploads_meta: Collection = db.uploads_metadata
        cursor = uploads_meta.find(
            {"user_id": user_id}
        ).sort("uploaded_at", DESCENDING).limit(limit)
        
        return list(cursor)
        
    except Exception as e:
        logger.error(f"Failed to get user uploads: {e}")
        return []


def delete_user_file(user_id: str, file_id: str) -> bool:
    """Delete a user file."""
    if db is None or grid_fs is None:
        return False
    
    try:
        from bson.objectid import ObjectId
        
        # Verify ownership
        uploads_meta: Collection = db.uploads_metadata
        upload = uploads_meta.find_one({
            "_id": file_id,
            "user_id": user_id
        })
        
        if not upload:
            return False
        
        # Delete from GridFS
        grid_fs.delete(ObjectId(file_id))
        
        # Delete metadata
        uploads_meta.delete_one({"_id": file_id})
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to delete file: {e}")
        return False


# User Profile Functions
def get_user_profile(user_id: str) -> Optional[Dict]:
    """
    Get user profile by user ID.
    Returns profile dict or None if not found.
    """
    if db is None:
        return None
    
    try:
        user_profiles: Collection = db.user_profiles
        profile = user_profiles.find_one({"user_id": user_id})
        
        if profile:
            # Convert ObjectId to string
            profile['_id'] = str(profile['_id'])
            return profile
        
        return None
        
    except Exception as e:
        logger.error(f"Failed to get user profile: {e}")
        return None


def create_or_update_user_profile(user_id: str, profile_data: Dict) -> Tuple[bool, str]:
    """
    Create or update user profile.
    Returns: (success, message)
    """
    if db is None:
        return False, "Database not connected"
    
    try:
        user_profiles: Collection = db.user_profiles
        
        # Add timestamps
        profile_data['user_id'] = user_id
        profile_data['updated_at'] = datetime.utcnow()
        
        # Check if profile exists
        existing = user_profiles.find_one({"user_id": user_id})
        
        if existing:
            # Update existing profile
            user_profiles.update_one(
                {"user_id": user_id},
                {"$set": profile_data}
            )
            return True, "Profile updated successfully"
        else:
            # Create new profile
            profile_data['created_at'] = datetime.utcnow()
            user_profiles.insert_one(profile_data)
            return True, "Profile created successfully"
        
    except Exception as e:
        logger.error(f"Failed to save user profile: {e}")
        return False, f"Failed to save profile: {str(e)}"


# Initialize collections on module import
if db is not None:
    init_auth_collections()
