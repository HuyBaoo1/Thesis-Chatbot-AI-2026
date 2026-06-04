import enum


class MessageRole(str, enum.Enum):
    USER = "USER"
    ASSISTANT = "ASSISTANT"
    SYSTEM = "SYSTEM"


class Channel(str, enum.Enum):
    WEB = "WEB"
    ZALO = "ZALO"
    FACEBOOK = "FACEBOOK"
    TELEGRAM = "TELEGRAM"
    


class StaffRole(str, enum.Enum):
    ADMIN = "ADMIN"
    COUNSELOR = "COUNSELOR"


class LeadTemperature(str, enum.Enum):
    HOT = "HOT"
    WARM = "WARM"
    COLD = "COLD"


class LeadStatus(str, enum.Enum):
    NEW = "NEW"
    CONTACTED = "CONTACTED"
    QUALIFIED = "QUALIFIED"
    APPLIED = "APPLIED"
    ENROLLED = "ENROLLED"
    LOST = "LOST"
    

class AdmissionStage(str, enum.Enum):
    NEW = "NEW"
    PROFILE_SUBMITTED = "PROFILE_SUBMITTED"
    DOCUMENT_REVIEW = "DOCUMENT_REVIEW"
    INTERVIEW = "INTERVIEW"
    OFFER_EXTENDED = "OFFER_EXTENDED"
    ENROLLED = "ENROLLED"
    REJECTED = "REJECTED"


class AdmissionCategory(str, enum.Enum):
    TUITION = "TUITION"
    SCHOLARSHIP = "SCHOLARSHIP"
    REQUIREMENT = "REQUIREMENT"
    DEADLINE = "DEADLINE"
    PROCESS = "PROCESS"
    MAJOR_INFO = "MAJOR_INFO"
    FAQ = "FAQ"

class MajorType(str, enum.Enum):
    UNDERGRAD_MAJOR = "UNDERGRAD_MAJOR"
    GRAD_MAJOR = "GRAD_MAJOR"
    CERTIFICATE_PROGRAM = "CERTIFICATE_PROGRAM"

class ConversationStatus(str, enum.Enum):
    OPEN = "OPEN"
    HANDOFF = "HANDOFF"
    CLOSED = "CLOSED"


class FeeType(str, enum.Enum):
    CREDIT = "CREDIT"
    SEMESTER = "SEMESTER"
    YEAR = "YEAR"
    HYBRID = "HYBRID"
    
class ScholarshipType(str, enum.Enum):
    MERIT = "MERIT"
    NEED_BASED = "NEED_BASED"
    TALENT = "TALENT"
    EARLY_BIRD = "EARLY_BIRD"
    SUPPLEMENTARY = "SUPPLEMENTARY"

class ScholarshipScope(str, enum.Enum):
    GLOBAL = "GLOBAL"
    MAJOR_PRIORITY = "MAJOR_PRIORITY"
    PROFILE_BASED = "PROFILE_BASED"
    
class ScholarshipValueType(str, enum.Enum):
    PERCENT = "PERCENT"
    AMOUNT = "AMOUNT"
    FULL = "FULL"
    
    
class NotificationTarget(str, enum.Enum):
    ADMIN = "ADMIN"
    STAFF = "STAFF"
    USER = "USER"


class NotificationType(str, enum.Enum):
    HOT_LEAD = "HOT_LEAD"
    FOLLOW_UP = "FOLLOW_UP"
    DEADLINE = "DEADLINE"
    APPLICATION_UPDATE = "APPLICATION_UPDATE"
    TUITION_INFO = "TUITION_INFO"
    FAQ_MISSING = "FAQ_MISSING"


class NotificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"
