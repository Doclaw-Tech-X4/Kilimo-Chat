"""
KilimoChat MongoDB Database Module
MongoDB Atlas integration for production scalability.

Collections:
- users: Phone numbers, language preferences, activity tracking
- messages: All chat interactions
- voice_messages: Voice pipeline tracking
- search_logs: Web search history
"""

import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict

from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.collection import Collection
from pymongo.database import Database

from config import (
    MONGODB_URI,
    MONGODB_DB_NAME,
    logger
)
from utils.datetime_utils import utc_now

# Global MongoDB client
mongo_client: Optional[MongoClient] = None
db: Optional[Database] = None


@dataclass
class VoiceMessageRecord:
    """Data class for voice message records."""
    id: str
    user_phone: str
    media_url: str
    local_path: str
    original_transcription: Optional[str] = None
    detected_language: Optional[str] = None
    translated_text: Optional[str] = None
    ai_response: Optional[str] = None
    status: str = "pending"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class UserRecord:
    """Data class for user records."""
    phone: str
    preferred_language: str = "en"
    message_count: int = 0
    last_active: Optional[datetime] = None


@dataclass
class MessageRecord:
    """Data class for message records."""
    id: str
    user_phone: str
    message_type: str
    content: str
    ai_response: str
    timestamp: datetime


@dataclass
class SearchLogRecord:
    """Data class for search log records."""
    id: str
    query: str
    results_json: str
    used_in_response: bool
    timestamp: datetime


def init_database() -> bool:
    """
    Initialize MongoDB connection and create collections/indexes.
    
    Returns:
        True if successful, False otherwise
    """
    global mongo_client, db
    
    try:
        if not MONGODB_URI:
            logger.warning("MONGODB_URI not set, falling back to local mode")
            return False
        
        # Connect to MongoDB with SSL/TLS settings
        mongo_client = MongoClient(
            MONGODB_URI,
            serverSelectionTimeoutMS=10000,  # Increased timeout
            connectTimeoutMS=10000,
            socketTimeoutMS=20000,
            retryWrites=True,
            w='majority',
            tls=True,  # Enable TLS
            tlsAllowInvalidCertificates=False,  # Require valid certs
        )
        
        # Test connection
        mongo_client.admin.command('ping')
        
        # Get database
        db = mongo_client[MONGODB_DB_NAME]
        
        # Create collections and indexes
        _setup_collections()
        
        logger.info("✅ MongoDB connected successfully")
        return True
        
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")
        return False


def _setup_collections():
    """Setup collections and indexes."""
    if db is None:
        return
    
    # Users collection
    users: Collection = db.users
    users.create_index("phone", unique=True)
    users.create_index("last_active")
    
    # Messages collection
    messages: Collection = db.messages
    messages.create_index("user_phone")
    messages.create_index("timestamp")
    messages.create_index([("user_phone", ASCENDING), ("timestamp", DESCENDING)])
    
    # Voice messages collection
    voice_msgs: Collection = db.voice_messages
    voice_msgs.create_index("user_phone")
    voice_msgs.create_index("status")
    voice_msgs.create_index("created_at")
    voice_msgs.create_index([("user_phone", ASCENDING), ("created_at", DESCENDING)])
    
    # Search logs collection
    search_logs: Collection = db.search_logs
    search_logs.create_index("timestamp")
    search_logs.create_index("query")
    
    logger.info("✅ MongoDB collections and indexes created")


def get_or_create_user(phone: str, detected_language: Optional[str] = None) -> UserRecord:
    """Get user or create new user with language preference."""
    if db is None:
        # Fallback: return mock user
        return UserRecord(phone=phone, preferred_language=detected_language or "en")
    
    users: Collection = db.users
    
    # Try to find existing user
    existing = users.find_one({"phone": phone})
    
    now = utc_now()
    
    if existing:
        # Update existing user
        users.update_one(
            {"phone": phone},
            {
                "$set": {"last_active": now},
                "$inc": {"message_count": 1}
            }
        )
        
        return UserRecord(
            phone=existing["phone"],
            preferred_language=existing.get("preferred_language", "en"),
            message_count=existing.get("message_count", 0) + 1,
            last_active=now
        )
    else:
        # Create new user
        lang = detected_language if detected_language else "en"
        user_doc = {
            "phone": phone,
            "preferred_language": lang,
            "message_count": 1,
            "last_active": now,
            "created_at": now
        }
        users.insert_one(user_doc)
        
        logger.info(f"Created new user: {phone} with language: {lang}")
        return UserRecord(
            phone=phone,
            preferred_language=lang,
            message_count=1,
            last_active=now
        )


def get_user_language(phone: str) -> str:
    """Get user's preferred language."""
    if db is None:
        return "en"
    
    users: Collection = db.users
    user = users.find_one({"phone": phone})
    
    return user.get("preferred_language", "en") if user else "en"


def update_user_language(phone: str, language: str) -> None:
    """Update user's preferred language."""
    if db is None:
        return
    
    users: Collection = db.users
    users.update_one(
        {"phone": phone},
        {"$set": {"preferred_language": language, "updated_at": utc_now()}}
    )
    logger.info(f"Updated user {phone} language to {language}")


def save_message(
    user_phone: str,
    message_type: str,
    content: str,
    ai_response: str
) -> str:
    """Save a message interaction to the database."""
    message_id = str(uuid.uuid4())
    
    if db is None:
        return message_id
    
    messages: Collection = db.messages
    
    doc = {
        "_id": message_id,
        "id": message_id,
        "user_phone": user_phone,
        "message_type": message_type,
        "content": content,
        "ai_response": ai_response,
        "timestamp": utc_now()
    }
    
    messages.insert_one(doc)
    return message_id


def create_voice_message(
    user_phone: str,
    media_url: str,
    local_path: str
) -> str:
    """Create a new voice message record."""
    message_id = str(uuid.uuid4())
    
    if db is None:
        return message_id
    
    voice_msgs: Collection = db.voice_messages
    now = utc_now()
    
    doc = {
        "_id": message_id,
        "id": message_id,
        "user_phone": user_phone,
        "media_url": media_url,
        "local_path": local_path,
        "status": "pending",
        "created_at": now,
        "updated_at": now
    }
    
    voice_msgs.insert_one(doc)
    logger.info(f"Created voice message record: {message_id}")
    return message_id


def update_voice_message(
    message_id: str,
    **kwargs
) -> None:
    """Update voice message record with transcription, translation, etc."""
    if db is None:
        return
    
    allowed_fields = [
        "original_transcription", "detected_language", "translated_text",
        "ai_response", "status"
    ]
    
    updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
    if not updates:
        return
    
    updates["updated_at"] = utc_now()
    
    voice_msgs: Collection = db.voice_messages
    voice_msgs.update_one(
        {"_id": message_id},
        {"$set": updates}
    )
    
    logger.debug(f"Updated voice message {message_id}: {updates}")


def get_voice_message(message_id: str) -> Optional[VoiceMessageRecord]:
    """Get voice message record by ID."""
    if db is None:
        return None
    
    voice_msgs: Collection = db.voice_messages
    doc = voice_msgs.find_one({"_id": message_id})
    
    if doc:
        return VoiceMessageRecord(
            id=doc["id"],
            user_phone=doc["user_phone"],
            media_url=doc["media_url"],
            local_path=doc["local_path"],
            original_transcription=doc.get("original_transcription"),
            detected_language=doc.get("detected_language"),
            translated_text=doc.get("translated_text"),
            ai_response=doc.get("ai_response"),
            status=doc.get("status", "pending"),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at")
        )
    return None


def save_search_log(
    query: str,
    results: List[Dict[str, Any]],
    used_in_response: bool = True
) -> str:
    """Save search query and results to database."""
    import json
    log_id = str(uuid.uuid4())
    
    if db is None:
        return log_id
    
    search_logs: Collection = db.search_logs
    
    doc = {
        "_id": log_id,
        "id": log_id,
        "query": query,
        "results_json": json.dumps(results, ensure_ascii=False),
        "used_in_response": used_in_response,
        "timestamp": utc_now()
    }
    
    search_logs.insert_one(doc)
    return log_id


def get_recent_messages(phone: str, limit: int = 5) -> List[MessageRecord]:
    """Get recent messages for a user."""
    if db is None:
        return []
    
    messages: Collection = db.messages
    cursor = messages.find(
        {"user_phone": phone}
    ).sort("timestamp", DESCENDING).limit(limit)
    
    return [
        MessageRecord(
            id=doc["id"],
            user_phone=doc["user_phone"],
            message_type=doc["message_type"],
            content=doc["content"],
            ai_response=doc["ai_response"],
            timestamp=doc["timestamp"]
        )
        for doc in cursor
    ]


def get_last_interactions(limit: int = 5) -> List[Dict[str, Any]]:
    """Get last interactions across all users for health check."""
    if db is None:
        return []
    
    messages: Collection = db.messages
    cursor = messages.find().sort("timestamp", DESCENDING).limit(limit)
    
    return [
        {
            "user_phone": doc["user_phone"],
            "type": doc["message_type"],
            "content": doc["content"][:50] + "..." if len(doc["content"]) > 50 else doc["content"],
            "response": doc["ai_response"][:50] + "..." if doc["ai_response"] and len(doc["ai_response"]) > 50 else doc["ai_response"],
            "timestamp": doc["timestamp"].isoformat() if isinstance(doc["timestamp"], datetime) else doc["timestamp"]
        }
        for doc in cursor
    ]


def get_db_stats() -> Dict[str, Any]:
    """Get database statistics for health check."""
    if db is None:
        return {"status": "disconnected", "collections": {}}
    
    try:
        stats = {
            "status": "connected",
            "database": MONGODB_DB_NAME,
            "collections": {}
        }
        
        for collection_name in ["users", "messages", "voice_messages", "search_logs"]:
            collection: Collection = db[collection_name]
            count = collection.count_documents({})
            stats["collections"][collection_name] = {"count": count}
        
        return stats
    except Exception as e:
        logger.error(f"Error getting DB stats: {e}")
        return {"status": "error", "error": str(e)}


# Initialize on module import
if MONGODB_URI:
    init_database()
else:
    logger.warning("MongoDB not configured, running in local mode")
