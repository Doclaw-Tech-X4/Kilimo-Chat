"""
KilimoChat Database Module
SQLite database management with all required tables for:
- Users (language preferences)
- Messages (chat history)
- Voice messages (voice pipeline tracking)
- Search logs (web search tracking)
"""

import sqlite3
import uuid
import json
import logging
from datetime import datetime
from pathlib import Path
from contextlib import contextmanager
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Database path
DB_PATH = Path("data/kilimochat.db")
DB_PATH.parent.mkdir(exist_ok=True)


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
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class UserRecord:
    """Data class for user records."""
    phone: str
    preferred_language: str = "en"
    message_count: int = 0
    last_active: Optional[str] = None


@dataclass
class MessageRecord:
    """Data class for message records."""
    id: str
    user_phone: str
    message_type: str
    content: str
    ai_response: str
    timestamp: str


@dataclass
class SearchLogRecord:
    """Data class for search log records."""
    id: str
    query: str
    results_json: str
    used_in_response: bool
    timestamp: str


@contextmanager
def get_db_connection():
    """Context manager for database connections."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_database() -> None:
    """Initialize all database tables."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                phone TEXT PRIMARY KEY,
                preferred_language TEXT DEFAULT 'en',
                message_count INTEGER DEFAULT 0,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Messages table (chat history)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                user_phone TEXT NOT NULL,
                message_type TEXT NOT NULL,
                content TEXT NOT NULL,
                ai_response TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_phone) REFERENCES users(phone)
            )
        """)
        
        # Voice messages table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS voice_messages (
                id TEXT PRIMARY KEY,
                user_phone TEXT NOT NULL,
                media_url TEXT NOT NULL,
                local_path TEXT NOT NULL,
                original_transcription TEXT,
                detected_language TEXT,
                translated_text TEXT,
                ai_response TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_phone) REFERENCES users(phone)
            )
        """)
        
        # Search logs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS search_logs (
                id TEXT PRIMARY KEY,
                query TEXT NOT NULL,
                results_json TEXT NOT NULL,
                used_in_response BOOLEAN DEFAULT 0,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes for better performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_phone)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_voice_user ON voice_messages(user_phone)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_voice_status ON voice_messages(status)")
        
        conn.commit()
        logger.info("Database initialized successfully")


def get_or_create_user(phone: str, detected_language: Optional[str] = None) -> UserRecord:
    """Get user or create new user with language preference."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Try to get existing user
        cursor.execute("SELECT * FROM users WHERE phone = ?", (phone,))
        row = cursor.fetchone()
        
        if row:
            # Update last_active and increment message_count
            # Also update preferred_language if detected and different
            current_lang = row["preferred_language"]
            new_lang = detected_language if detected_language else current_lang
            
            if detected_language and detected_language != current_lang:
                # Language changed, update it
                cursor.execute("""
                    UPDATE users 
                    SET last_active = CURRENT_TIMESTAMP, 
                        message_count = message_count + 1,
                        preferred_language = ?
                    WHERE phone = ?
                """, (new_lang, phone))
                logger.info(f"Updated user {phone} language from {current_lang} to {new_lang}")
            else:
                cursor.execute("""
                    UPDATE users 
                    SET last_active = CURRENT_TIMESTAMP, message_count = message_count + 1
                    WHERE phone = ?
                """, (phone,))
            conn.commit()
            
            return UserRecord(
                phone=row["phone"],
                preferred_language=new_lang,
                message_count=row["message_count"] + 1,
                last_active=datetime.now().isoformat()
            )
        else:
            # Create new user
            lang = detected_language if detected_language else "en"
            cursor.execute("""
                INSERT INTO users (phone, preferred_language, message_count, last_active)
                VALUES (?, ?, 1, CURRENT_TIMESTAMP)
            """, (phone, lang))
            conn.commit()
            
            logger.info(f"Created new user: {phone} with language: {lang}")
            return UserRecord(
                phone=phone,
                preferred_language=lang,
                message_count=1,
                last_active=datetime.now().isoformat()
            )


def get_user_language(phone: str) -> str:
    """Get user's preferred language."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT preferred_language FROM users WHERE phone = ?", (phone,))
        row = cursor.fetchone()
        return row["preferred_language"] if row else "en"


def update_user_language(phone: str, language: str) -> None:
    """Update user's preferred language."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE users SET preferred_language = ? WHERE phone = ?
        """, (language, phone))
        conn.commit()
        logger.info(f"Updated user {phone} language to {language}")


def save_message(
    user_phone: str,
    message_type: str,
    content: str,
    ai_response: str
) -> str:
    """Save a message interaction to the database."""
    message_id = str(uuid.uuid4())
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO messages (id, user_phone, message_type, content, ai_response, timestamp)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (message_id, user_phone, message_type, content, ai_response))
        conn.commit()
    
    return message_id


def create_voice_message(
    user_phone: str,
    media_url: str,
    local_path: str
) -> str:
    """Create a new voice message record."""
    message_id = str(uuid.uuid4())
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO voice_messages 
            (id, user_phone, media_url, local_path, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """, (message_id, user_phone, media_url, local_path))
        conn.commit()
    
    logger.info(f"Created voice message record: {message_id}")
    return message_id


def update_voice_message(
    message_id: str,
    **kwargs
) -> None:
    """Update voice message record with transcription, translation, etc."""
    allowed_fields = [
        "original_transcription", "detected_language", "translated_text",
        "ai_response", "status"
    ]
    
    updates = {k: v for k, v in kwargs.items() if k in allowed_fields}
    if not updates:
        return
    
    set_clause = ", ".join([f"{k} = ?" for k in updates.keys()])
    values = list(updates.values()) + [message_id]
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(f"""
            UPDATE voice_messages 
            SET {set_clause}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, values)
        conn.commit()
    
    logger.info(f"Updated voice message {message_id}: {updates}")


def get_voice_message(message_id: str) -> Optional[VoiceMessageRecord]:
    """Get voice message record by ID."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM voice_messages WHERE id = ?", (message_id,))
        row = cursor.fetchone()
        
        if row:
            return VoiceMessageRecord(
                id=row["id"],
                user_phone=row["user_phone"],
                media_url=row["media_url"],
                local_path=row["local_path"],
                original_transcription=row["original_transcription"],
                detected_language=row["detected_language"],
                translated_text=row["translated_text"],
                ai_response=row["ai_response"],
                status=row["status"],
                created_at=row["created_at"],
                updated_at=row["updated_at"]
            )
        return None


def save_search_log(
    query: str,
    results: List[Dict[str, Any]],
    used_in_response: bool = True
) -> str:
    """Save search query and results to database."""
    log_id = str(uuid.uuid4())
    results_json = json.dumps(results, ensure_ascii=False)
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO search_logs (id, query, results_json, used_in_response, timestamp)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (log_id, query, results_json, used_in_response))
        conn.commit()
    
    return log_id


def get_recent_messages(phone: str, limit: int = 5) -> List[MessageRecord]:
    """Get recent messages for a user."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM messages 
            WHERE user_phone = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
        """, (phone, limit))
        
        rows = cursor.fetchall()
        return [
            MessageRecord(
                id=row["id"],
                user_phone=row["user_phone"],
                message_type=row["message_type"],
                content=row["content"],
                ai_response=row["ai_response"],
                timestamp=row["timestamp"]
            )
            for row in rows
        ]


def get_last_interactions(limit: int = 5) -> List[Dict[str, Any]]:
    """Get last interactions across all users for health check."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT user_phone, message_type, content, ai_response, timestamp
            FROM messages
            ORDER BY timestamp DESC
            LIMIT ?
        """, (limit,))
        
        rows = cursor.fetchall()
        return [
            {
                "user_phone": row["user_phone"],
                "type": row["message_type"],
                "content": row["content"][:50] + "..." if len(row["content"]) > 50 else row["content"],
                "response": row["ai_response"][:50] + "..." if row["ai_response"] and len(row["ai_response"]) > 50 else row["ai_response"],
                "timestamp": row["timestamp"]
            }
            for row in rows
        ]


def cleanup_old_voice_files(max_age_hours: int = 24) -> int:
    """Clean up voice files older than specified hours."""
    from datetime import timedelta
    
    cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, local_path FROM voice_messages
            WHERE created_at < ? AND status = 'completed'
        """, (cutoff_time.isoformat(),))
        
        rows = cursor.fetchall()
        deleted_count = 0
        
        for row in rows:
            file_path = Path(row["local_path"])
            if file_path.exists():
                try:
                    file_path.unlink()
                    deleted_count += 1
                    logger.info(f"Deleted old voice file: {file_path}")
                except Exception as e:
                    logger.error(f"Failed to delete {file_path}: {e}")
        
        return deleted_count


def get_db_stats() -> Dict[str, Any]:
    """Get database statistics for health check."""
    try:
        stats = {
            "status": "connected",
            "type": "sqlite",
            "collections": {}
        }
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Get table counts
            for table in ["users", "messages", "voice_messages", "search_logs"]:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cursor.fetchone()[0]
                    stats["collections"][table] = {"count": count}
                except Exception as e:
                    stats["collections"][table] = {"count": 0, "error": str(e)}
        
        return stats
    except Exception as e:
        logger.error(f"Error getting DB stats: {e}")
        return {"status": "error", "error": str(e)}


# Initialize database on module import
init_database()
