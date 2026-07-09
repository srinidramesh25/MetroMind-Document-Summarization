from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Table, Boolean, Float, JSON
from sqlalchemy.orm import relationship
import datetime
from app.database import Base

# Association Table for Documents and Tags
document_tags = Table(
    "document_tags",
    Base.metadata,
    Column("document_id", Integer, ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)
)

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True) # Super Admin, Department Admin, Employee
    description = Column(String(255))
    
    users = relationship("User", back_populates="role_rel")

class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    code = Column(String(10), unique=True, nullable=False)
    description = Column(String(255))
    
    users = relationship("User", back_populates="department_rel")
    documents = relationship("Document", back_populates="department_rel")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"))
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    status = Column(String(20), default="active") # active, inactive
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    role_rel = relationship("Role", back_populates="users")
    department_rel = relationship("Department", back_populates="users")
    uploaded_documents = relationship("Document", back_populates="uploader_rel")
    audit_logs = relationship("AuditLog", back_populates="user_rel")
    notifications = relationship("Notification", back_populates="user_rel")
    conversations = relationship("Conversation", back_populates="user_rel")

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(255))
    
    documents = relationship("Document", back_populates="category_rel")

class Tag(Base):
    __tablename__ = "tags"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    
    documents = relationship("Document", secondary=document_tags, back_populates="tags")

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    file_type = Column(String(50), nullable=False) # pdf, docx, pptx, xlsx, txt, csv, image
    status = Column(String(50), default="Pending") # Pending, Processing, Completed, Failed
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    department_id = Column(Integer, ForeignKey("departments.id"))
    category_id = Column(Integer, ForeignKey("categories.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    uploader_rel = relationship("User", back_populates="uploaded_documents")
    department_rel = relationship("Department", back_populates="documents")
    category_rel = relationship("Category", back_populates="documents")
    tags = relationship("Tag", secondary=document_tags, back_populates="documents")
    versions = relationship("DocumentVersion", back_populates="document_rel", cascade="all, delete-orphan")
    ocr_result = relationship("OCRResult", uselist=False, back_populates="document_rel", cascade="all, delete-orphan")
    summary = relationship("Summary", uselist=False, back_populates="document_rel", cascade="all, delete-orphan")
    entities = relationship("Entity", back_populates="document_rel", cascade="all, delete-orphan")
    embeddings = relationship("Embedding", back_populates="document_rel", cascade="all, delete-orphan")

class DocumentVersion(Base):
    __tablename__ = "document_versions"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"))
    version_number = Column(Integer, nullable=False)
    file_path = Column(String(500), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    document_rel = relationship("Document", back_populates="versions")

class OCRResult(Base):
    __tablename__ = "ocr_results"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), unique=True)
    extracted_text = Column(Text, nullable=False)
    raw_ocr_data = Column(JSON, nullable=True) # Holds full word coordinates or line data
    language = Column(String(10), default="en") # en, ml, hi
    ocr_engine = Column(String(50), default="PyTesseract")
    processed_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    document_rel = relationship("Document", back_populates="ocr_result")

class Summary(Base):
    __tablename__ = "summaries"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), unique=True)
    executive_summary = Column(Text)
    detailed_summary = Column(Text)
    bullet_summary = Column(Text)
    compliance_summary = Column(Text)
    action_items = Column(Text)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    document_rel = relationship("Document", back_populates="summary")

class Entity(Base):
    __tablename__ = "entities"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"))
    entity_type = Column(String(50), nullable=False, index=True) # Person, Organization, Location, Date, ContractNumber, ReferenceID, MonetaryValue, ProjectName
    entity_value = Column(String(255), nullable=False, index=True)
    confidence = Column(Float, default=1.0)
    metadata_json = Column(JSON, nullable=True)
    
    document_rel = relationship("Document", back_populates="entities")

class Embedding(Base):
    __tablename__ = "embeddings"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"))
    chunk_index = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    embedding_vector_id = Column(String(255), nullable=False) # Maps to ChromaDB ID
    
    document_rel = relationship("Document", back_populates="embeddings")

class KnowledgeGraphNode(Base):
    __tablename__ = "knowledge_graph_nodes"
    id = Column(String(100), primary_key=True) # Custom ID e.g. "doc_5" or "ent_12"
    label = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False) # Document, Person, Department, Project, Vendor, Contract
    properties = Column(JSON, nullable=True)

class KnowledgeGraphEdge(Base):
    __tablename__ = "knowledge_graph_edges"
    id = Column(Integer, primary_key=True, index=True)
    source_node_id = Column(String(100), nullable=False, index=True)
    target_node_id = Column(String(100), nullable=False, index=True)
    relation_type = Column(String(50), nullable=False, index=True) # BELONGS_TO, MENTIONS, CONTRACT_WITH, LOCATED_AT, RELATED_TO
    properties = Column(JSON, nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    ip_address = Column(String(50))
    details = Column(Text)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    user_rel = relationship("User", back_populates="audit_logs")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info") # info, success, warning, alert
    read_status = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user_rel = relationship("User", back_populates="notifications")

class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False) # Department, Compliance, Activity, AIUsage, Growth
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    file_path = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user_rel = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation_rel", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"))
    sender = Column(String(50), nullable=False) # user, system, assistant
    text = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    source_citations = Column(JSON, nullable=True) # list of matching document IDs/snippet text/page references
    
    conversation_rel = relationship("Conversation", back_populates="messages")
