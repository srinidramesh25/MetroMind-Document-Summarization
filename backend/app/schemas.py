from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Any, Dict
import datetime

# --- Token & Authentication ---
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str
    email: str
    department_id: Optional[int] = None

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# --- Department & Role ---
class DepartmentOut(BaseModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class RoleOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str
    role_id: int
    department_id: Optional[int] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(UserBase):
    id: int
    role_id: int
    department_id: Optional[int] = None
    status: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    role_id: Optional[int] = None
    department_id: Optional[int] = None

# --- OCR, Summaries, Entities ---
class OCRResultOut(BaseModel):
    id: int
    document_id: int
    extracted_text: str
    language: str
    ocr_engine: str
    processed_at: datetime.datetime

    class Config:
        from_attributes = True

class SummaryOut(BaseModel):
    id: int
    document_id: int
    executive_summary: Optional[str] = None
    detailed_summary: Optional[str] = None
    bullet_summary: Optional[str] = None
    compliance_summary: Optional[str] = None
    action_items: Optional[str] = None
    generated_at: datetime.datetime

    class Config:
        from_attributes = True

class EntityOut(BaseModel):
    id: int
    entity_type: str
    entity_value: str
    confidence: float
    metadata_json: Optional[Any] = None

    class Config:
        from_attributes = True

# --- Document Schemas ---
class DocumentOut(BaseModel):
    id: int
    title: str
    filename: str
    file_size: int
    file_type: str
    status: str
    uploaded_by: int
    department_id: Optional[int] = None
    category_id: Optional[int] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

class DocumentDetailOut(DocumentOut):
    ocr_result: Optional[OCRResultOut] = None
    summary: Optional[SummaryOut] = None
    entities: List[EntityOut] = []

    class Config:
        from_attributes = True

# --- Chat/RAG Schemas ---
class MessageCreate(BaseModel):
    text: str

class MessageOut(BaseModel):
    id: int
    sender: str # user, system, assistant
    text: str
    timestamp: datetime.datetime
    source_citations: Optional[List[Dict[str, Any]]] = None

    class Config:
        from_attributes = True

class ConversationCreate(BaseModel):
    title: str

class ConversationOut(BaseModel):
    id: int
    title: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class ConversationDetailOut(ConversationOut):
    messages: List[MessageOut] = []

    class Config:
        from_attributes = True

# --- Search Schemas ---
class SearchQuery(BaseModel):
    query: str
    department_id: Optional[int] = None
    category_id: Optional[int] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None

class SearchResultItem(BaseModel):
    document_id: int
    title: str
    file_type: str
    relevance_score: float
    matching_snippet: str
    summary_bullet: Optional[str] = None
    department: Optional[str] = None

class SearchResponse(BaseModel):
    results: List[SearchResultItem]

# --- Compliance Schemas ---
class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    action: str
    ip_address: Optional[str] = None
    details: Optional[str] = None
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

# --- Analytics Schemas ---
class DashboardMetrics(BaseModel):
    total_documents: int
    active_users: int
    ai_queries: int
    search_success_rate: float
    compliance_alerts: int
    pending_reviews: int

class AnalyticsTrendPoint(BaseModel):
    date: str
    count: int

class AnalyticsChartData(BaseModel):
    upload_trends: List[AnalyticsTrendPoint]
    department_activity: List[Dict[str, Any]]
    category_distribution: List[Dict[str, Any]]
    ai_usage: List[AnalyticsTrendPoint]
    search_analytics: List[Dict[str, Any]]

# --- Notification Schemas ---
class Notification(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    read_status: bool
    created_at: datetime.datetime

class Config:
    from_attributes = True