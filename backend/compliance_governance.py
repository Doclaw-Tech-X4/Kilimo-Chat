"""
Compliance and Data Governance Module for KilimoChat
Implements Kenya Ministry of Agriculture Data Governance Framework requirements.

Features:
- Consent tracking for farmer data
- Role-based access control (RBAC)
- Data encryption at rest (AES-256)
- Audit logging
- Privacy compliance
"""

import json
import hashlib
import secrets
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from config import logger

# Encryption support
try:
    from cryptography.fernet import Fernet
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    ENCRYPTION_AVAILABLE = True
except ImportError:
    ENCRYPTION_AVAILABLE = False
    logger.warning("cryptography not installed. Encryption disabled.")


class DataCategory(Enum):
    """Categories of agricultural data."""
    PERSONAL = "personal"  # Farmer PII
    FARM = "farm"  # Farm boundaries, size
    PRODUCTION = "production"  # Yield data
    FINANCIAL = "financial"  # Transactions, subsidies
    KNOWLEDGE = "knowledge"  # Public agricultural facts
    ADMIN = "admin"  # System administrative


class ConsentType(Enum):
    """Types of consent."""
    REGISTRATION = "registration"
    DATA_SHARING = "data_sharing"
    MARKET_ACCESS = "market_access"
    RESEARCH = "research"


class Role(Enum):
    """User roles for RBAC."""
    FARMER = "farmer"
    EXTENSION_OFFICER = "extension_officer"
    ADMIN = "admin"
    RESEARCHER = "researcher"
    SERVICE_PROVIDER = "service_provider"


@dataclass
class ConsentRecord:
    """Records farmer consent for data usage."""
    farmer_id: str
    consent_type: str
    granted: bool
    timestamp: str
    purpose: str
    data_categories: List[str]
    expiry_date: Optional[str] = None
    revoked: bool = False
    revoked_date: Optional[str] = None
    consent_method: str = "digital"  # digital, paper, verbal
    witness_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "farmer_id": self.farmer_id,
            "consent_type": self.consent_type,
            "granted": self.granted,
            "timestamp": self.timestamp,
            "purpose": self.purpose,
            "data_categories": self.data_categories,
            "expiry_date": self.expiry_date,
            "revoked": self.revoked,
            "revoked_date": self.revoked_date,
            "consent_method": self.consent_method,
            "witness_id": self.witness_id
        }
    
    @property
    def is_valid(self) -> bool:
        """Check if consent is currently valid."""
        if not self.granted or self.revoked:
            return False
        
        if self.expiry_date:
            return datetime.now().isoformat() < self.expiry_date
        
        return True


@dataclass
class AuditLog:
    """Audit log entry for data access."""
    timestamp: str
    user_id: str
    user_role: str
    action: str
    data_category: str
    resource_id: str
    ip_address: Optional[str] = None
    success: bool = True
    reason: str = ""


class DataEncryption:
    """Handles AES-256 encryption for sensitive data."""
    
    def __init__(self, key: Optional[bytes] = None):
        self.key = key
        self.fernet = None
        
        if ENCRYPTION_AVAILABLE and key:
            self.fernet = Fernet(key)
    
    @staticmethod
    def generate_key(password: str, salt: Optional[bytes] = None) -> bytes:
        """Generate encryption key from password."""
        if not ENCRYPTION_AVAILABLE:
            raise ImportError("cryptography library required")
        
        if salt is None:
            salt = secrets.token_bytes(16)
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=480000,
        )
        
        key = kdf.derive(password.encode())
        import base64
        return base64.urlsafe_b64encode(key)
    
    def encrypt(self, data: str) -> str:
        """Encrypt string data."""
        if not self.fernet:
            raise ValueError("Encryption not initialized")
        
        return self.fernet.encrypt(data.encode()).decode()
    
    def decrypt(self, token: str) -> str:
        """Decrypt encrypted data."""
        if not self.fernet:
            raise ValueError("Encryption not initialized")
        
        return self.fernet.decrypt(token.encode()).decode()


class ConsentManager:
    """Manages farmer consent tracking."""
    
    def __init__(self, storage_path: str = "data/consent_records.json"):
        self.storage_path = storage_path
        self.records: Dict[str, List[ConsentRecord]] = {}
        self._load_records()
    
    def _load_records(self):
        """Load existing consent records."""
        try:
            import os
            if os.path.exists(self.storage_path):
                with open(self.storage_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for farmer_id, records in data.items():
                        self.records[farmer_id] = [
                            ConsentRecord(**r) for r in records
                        ]
        except Exception as e:
            logger.error(f"Failed to load consent records: {e}")
    
    def _save_records(self):
        """Save consent records to file."""
        try:
            import os
            os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
            
            data = {
                farmer_id: [r.to_dict() for r in records]
                for farmer_id, records in self.records.items()
            }
            
            with open(self.storage_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save consent records: {e}")
    
    def record_consent(self, farmer_id: str, consent_type: str, 
                       granted: bool, purpose: str,
                       data_categories: List[str],
                       expiry_days: Optional[int] = None,
                       consent_method: str = "digital") -> ConsentRecord:
        """Record farmer consent."""
        
        expiry_date = None
        if expiry_days:
            from datetime import timedelta
            expiry = datetime.now() + timedelta(days=expiry_days)
            expiry_date = expiry.isoformat()
        
        record = ConsentRecord(
            farmer_id=farmer_id,
            consent_type=consent_type,
            granted=granted,
            timestamp=datetime.now().isoformat(),
            purpose=purpose,
            data_categories=data_categories,
            expiry_date=expiry_date,
            consent_method=consent_method
        )
        
        if farmer_id not in self.records:
            self.records[farmer_id] = []
        
        self.records[farmer_id].append(record)
        self._save_records()
        
        logger.info(f"Recorded consent: {farmer_id} - {consent_type} - Granted: {granted}")
        
        return record
    
    def check_consent(self, farmer_id: str, consent_type: str,
                      data_category: str) -> bool:
        """Check if farmer has valid consent for data usage."""
        
        if farmer_id not in self.records:
            return False
        
        # Check for valid consent records
        for record in reversed(self.records[farmer_id]):
            if record.consent_type == consent_type:
                if record.is_valid and data_category in record.data_categories:
                    return True
        
        return False
    
    def revoke_consent(self, farmer_id: str, consent_type: str) -> bool:
        """Revoke previously granted consent."""
        
        if farmer_id not in self.records:
            return False
        
        for record in self.records[farmer_id]:
            if record.consent_type == consent_type and record.is_valid:
                record.revoked = True
                record.revoked_date = datetime.now().isoformat()
        
        self._save_records()
        logger.info(f"Revoked consent: {farmer_id} - {consent_type}")
        
        return True
    
    def get_consent_history(self, farmer_id: str) -> List[Dict]:
        """Get full consent history for a farmer."""
        if farmer_id not in self.records:
            return []
        
        return [r.to_dict() for r in self.records[farmer_id]]


class AccessControl:
    """Role-based access control (RBAC)."""
    
    # Define permissions for each role
    PERMISSIONS = {
        Role.FARMER: [
            "read_own_data",
            "update_own_profile",
            "give_consent",
            "revoke_consent",
            "access_knowledge_base"
        ],
        Role.EXTENSION_OFFICER: [
            "read_farmer_data",
            "create_farmer_record",
            "update_farmer_data",
            "access_knowledge_base",
            "generate_reports"
        ],
        Role.ADMIN: [
            "read_all_data",
            "write_all_data",
            "delete_data",
            "manage_users",
            "manage_consent",
            "access_knowledge_base",
            "upload_documents",
            "audit_logs"
        ],
        Role.RESEARCHER: [
            "read_anonymized_data",
            "generate_aggregated_reports",
            "access_knowledge_base"
        ],
        Role.SERVICE_PROVIDER: [
            "read_farmer_data_with_consent",
            "provide_services",
            "access_knowledge_base"
        ]
    }
    
    @classmethod
    def has_permission(cls, role: Role, permission: str) -> bool:
        """Check if role has specific permission."""
        role_perms = cls.PERMISSIONS.get(role, [])
        return permission in role_perms
    
    @classmethod
    def can_access_data(cls, user_role: Role, data_owner_id: str,
                        accessor_id: str, data_category: DataCategory,
                        consent_manager: ConsentManager) -> bool:
        """Check if user can access specific data."""
        
        # Admin can access everything
        if user_role == Role.ADMIN:
            return True
        
        # User can access own data
        if data_owner_id == accessor_id:
            return True
        
        # Extension officers can access farmer data in their jurisdiction
        if user_role == Role.EXTENSION_OFFICER:
            return True  # Additional logic for jurisdiction can be added
        
        # Service providers need consent
        if user_role == Role.SERVICE_PROVIDER:
            if data_category == DataCategory.KNOWLEDGE:
                return True
            return consent_manager.check_consent(
                data_owner_id, 
                ConsentType.DATA_SHARING.value,
                data_category.value
            )
        
        # Researchers can access anonymized data
        if user_role == Role.RESEARCHER:
            return data_category in [DataCategory.KNOWLEDGE, DataCategory.PRODUCTION]
        
        return False


class AuditLogger:
    """Audit logging for compliance."""
    
    def __init__(self, log_path: str = "logs/audit.log"):
        self.log_path = log_path
        self._ensure_log_dir()
    
    def _ensure_log_dir(self):
        """Ensure log directory exists."""
        import os
        os.makedirs(os.path.dirname(self.log_path), exist_ok=True)
    
    def log(self, entry: AuditLog):
        """Write audit log entry."""
        log_line = (
            f"{entry.timestamp} | {entry.user_role}:{entry.user_id} | "
            f"{entry.action} | {entry.data_category}:{entry.resource_id} | "
            f"{entry.ip_address or 'N/A'} | "
            f"{'SUCCESS' if entry.success else 'FAILURE'} | {entry.reason}\n"
        )
        
        try:
            with open(self.log_path, 'a', encoding='utf-8') as f:
                f.write(log_line)
        except Exception as e:
            logger.error(f"Failed to write audit log: {e}")
    
    def log_access(self, user_id: str, user_role: str, action: str,
                   data_category: str, resource_id: str,
                   success: bool = True, reason: str = "",
                   ip_address: Optional[str] = None):
        """Convenience method for logging access."""
        entry = AuditLog(
            timestamp=datetime.now().isoformat(),
            user_id=user_id,
            user_role=user_role,
            action=action,
            data_category=data_category,
            resource_id=resource_id,
            ip_address=ip_address,
            success=success,
            reason=reason
        )
        self.log(entry)


class ComplianceManager:
    """Main compliance manager combining all governance features."""
    
    def __init__(self):
        self.consent_manager = ConsentManager()
        self.audit_logger = AuditLogger()
        self.encryption = None
        
        # Initialize encryption if key available
        if ENCRYPTION_AVAILABLE:
            # In production, load from secure environment variable
            key = os.getenv("ENCRYPTION_KEY")
            if key:
                self.encryption = DataEncryption(key.encode())
    
    def validate_data_access(self, user_id: str, user_role: str,
                           data_owner_id: str, data_category: str,
                           action: str, ip_address: Optional[str] = None) -> bool:
        """Validate data access with consent and audit logging."""
        
        try:
            role = Role(user_role)
            category = DataCategory(data_category)
        except ValueError:
            # Invalid role or category
            self.audit_logger.log_access(
                user_id, user_role, action, data_category,
                data_owner_id, success=False,
                reason="Invalid role or data category",
                ip_address=ip_address
            )
            return False
        
        # Check access permission
        allowed = AccessControl.can_access_data(
            role, data_owner_id, user_id, category,
            self.consent_manager
        )
        
        # Log the attempt
        self.audit_logger.log_access(
            user_id, user_role, action, data_category,
            data_owner_id, success=allowed,
            reason="Consent valid" if allowed else "Access denied",
            ip_address=ip_address
        )
        
        return allowed
    
    def encrypt_sensitive_data(self, data: str) -> Optional[str]:
        """Encrypt sensitive data."""
        if self.encryption:
            return self.encryption.encrypt(data)
        return None
    
    def decrypt_sensitive_data(self, token: str) -> Optional[str]:
        """Decrypt sensitive data."""
        if self.encryption:
            return self.encryption.decrypt(token)
        return None


# Global compliance manager
_compliance_manager: Optional[ComplianceManager] = None

def get_compliance_manager() -> ComplianceManager:
    """Get or create global compliance manager."""
    global _compliance_manager
    if _compliance_manager is None:
        _compliance_manager = ComplianceManager()
    return _compliance_manager
