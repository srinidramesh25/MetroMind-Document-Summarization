import os
import uuid
import shutil
import logging
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth
from app.services.ocr import OCRService
from app.services.summary import SummaryService
from app.services.entity import EntityService
from app.services.vector import VectorService
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/documents",
    tags=["Documents Management"]
)

# Supported formats check
SUPPORTED_EXTENSIONS = {
    "pdf", "docx", "pptx", "xlsx", "txt", "csv", "png", "jpg", "jpeg"
}

def process_document_pipeline(document_id: int, file_path: str, file_ext: str, db_session_maker, user_id: int):
    """
    Executes the document ingestion pipeline.
    Runs asynchronously in the background.
    """
    db: Session = db_session_maker()
    try:
        doc = db.query(models.Document).filter(models.Document.id == document_id).first()
        if not doc:
            return

        # 1. OCR / Text Extraction
        extracted_data = OCRService.extract_text(file_path, file_ext)
        ocr_res = models.OCRResult(
            document_id=doc.id,
            extracted_text=extracted_data["text"],
            language=extracted_data["language"],
            ocr_engine=extracted_data["engine"],
            raw_ocr_data=extracted_data["raw_data"]
        )
        db.add(ocr_res)
        db.commit()

        # Update status to processing metadata
        doc.status = "Processing Metadata"
        db.commit()

        # 2. Summarization Engine
        summaries = SummaryService.generate_all_summaries(extracted_data["text"])
        sum_model = models.Summary(
            document_id=doc.id,
            executive_summary=summaries["executive_summary"],
            detailed_summary=summaries["detailed_summary"],
            bullet_summary=summaries["bullet_summary"],
            compliance_summary=summaries["compliance_summary"],
            action_items=summaries["action_items"]
        )
        db.add(sum_model)

        # 3. Entity Extraction
        entities = EntityService.extract_entities(extracted_data["text"])
        for ent in entities:
            entity_model = models.Entity(
                document_id=doc.id,
                entity_type=ent["type"],
                entity_value=ent["value"],
                confidence=ent["confidence"],
                metadata_json=ent["metadata"]
            )
            db.add(entity_model)

        # 4. Auto-Classification rules based on text keywords
        text_lower = extracted_data["text"].lower()
        category_name = "Operations" # Default
        if any(w in text_lower for w in ["safety", "accident", "hazard", "fire", "drill"]):
            category_name = "Safety"
        elif any(w in text_lower for w in ["leave", "shift", "hr", "payroll", "employee", "hiring"]):
            category_name = "HR"
        elif any(w in text_lower for w in ["invoice", "budget", "finance", "expenditure", "cost", "lakh", "crore"]):
            category_name = "Finance"
        elif any(w in text_lower for w in ["contract", "regulation", "act", "compliance", "legal", "clause"]):
            category_name = "Legal"
        elif any(w in text_lower for w in ["procure", "tender", "bid", "vendor", "purchase"]):
            category_name = "Procurement"
        elif any(w in text_lower for w in ["track", "ohe", "depot", "lubrication", "grind", "maintenance", "repair"]):
            category_name = "Maintenance"

        # Resolve category
        category = db.query(models.Category).filter(models.Category.name == category_name).first()
        if category:
            doc.category_id = category.id

        db.commit()

        # 5. Embeddings Generation & Vector Store Indexing
        mappings = VectorService.add_document(doc.id, extracted_data["text"], doc.title)
        for m in mappings:
            emb_model = models.Embedding(
                document_id=doc.id,
                chunk_index=m["chunk_index"],
                chunk_text=m["chunk_text"],
                embedding_vector_id=m["embedding_vector_id"]
            )
            db.add(emb_model)

        # 6. Populate Knowledge Graph
        # Node for Document
        doc_node_id = f"doc_{doc.id}"
        doc_node = db.query(models.KnowledgeGraphNode).filter(models.KnowledgeGraphNode.id == doc_node_id).first()
        if not doc_node:
            db.add(models.KnowledgeGraphNode(
                id=doc_node_id,
                label=doc.title,
                type="Document",
                properties={"file_type": doc.file_type, "uploaded_at": str(doc.created_at)}
            ))
        
        # Link Document Node to Department Node
        dept = db.query(models.Department).filter(models.Department.id == doc.department_id).first()
        if dept:
            dept_node_id = f"dept_{dept.id}"
            # Ensure dept node exists
            dept_node = db.query(models.KnowledgeGraphNode).filter(models.KnowledgeGraphNode.id == dept_node_id).first()
            if not dept_node:
                db.add(models.KnowledgeGraphNode(
                    id=dept_node_id,
                    label=dept.name,
                    type="Department",
                    properties={"code": dept.code}
                ))
            # Create relationship
            db.add(models.KnowledgeGraphEdge(
                source_node_id=doc_node_id,
                target_node_id=dept_node_id,
                relation_type="BELONGS_TO"
            ))

        # Link to Entities (Organizations, Locations, Persons)
        for ent in entities:
            # Create node for Entity if it fits
            if ent["type"] in ["Person", "Organization", "Location", "ProjectName", "ContractNumber"]:
                # Custom entity node ID
                ent_val_clean = ent["value"].replace(" ", "_").lower()
                ent_node_id = f"ent_{ent['type'].lower()}_{ent_val_clean}"
                
                # Check existence
                ent_node = db.query(models.KnowledgeGraphNode).filter(models.KnowledgeGraphNode.id == ent_node_id).first()
                if not ent_node:
                    db.add(models.KnowledgeGraphNode(
                        id=ent_node_id,
                        label=ent["value"],
                        type=ent["type"],
                        properties={"confidence": ent["confidence"]}
                    ))
                
                # Create Mentions Edge
                db.add(models.KnowledgeGraphEdge(
                    source_node_id=doc_node_id,
                    target_node_id=ent_node_id,
                    relation_type="MENTIONS"
                ))

        # Complete Ingestion
        doc.status = "Completed"
        db.commit()

        # Send Real-Time Notification
        notification = models.Notification(
            user_id=user_id,
            title="Document Processed Successfully",
            message=f"System has completed OCR, Summarization, and Vector Indexing for '{doc.title}'.",
            type="success",
            read_status=False
        )
        db.add(notification)
        db.commit()

    except Exception as e:
        logger.error(f"Error in document pipeline for document {document_id}: {str(e)}")
        # Rollback metadata writes
        db.rollback()
        # Mark document as failed
        doc = db.query(models.Document).filter(models.Document.id == document_id).first()
        if doc:
            doc.status = "Failed"
            db.commit()
            
            # Send Notification of failure
            notification = models.Notification(
                user_id=user_id,
                title="Document Processing Failed",
                message=f"An error occurred while analyzing '{doc.title}'. Error details: {str(e)[:100]}...",
                type="alert",
                read_status=False
            )
            db.add(notification)
            db.commit()
    finally:
        db.close()

@router.post("/upload", response_model=schemas.DocumentOut, status_code=status.HTTP_201_CREATED)
def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(...),
    department_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Extension validation
    file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if file_ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Supported extensions are: {', '.join(SUPPORTED_EXTENSIONS)}"
        )

    # Validate department
    dept = db.query(models.Department).filter(models.Department.id == department_id).first()
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Specified department does not exist."
        )

    # Save original file
    file_uuid = uuid.uuid4()
    save_filename = f"{file_uuid}_{file.filename}"
    save_path = os.path.join(settings.UPLOAD_DIR, save_filename)
    
    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save uploaded file. Error: {str(e)}"
        )

    # Get size
    file_size = os.path.getsize(save_path)

    # Create Document record
    new_doc = models.Document(
        title=title,
        filename=file.filename,
        file_path=save_path,
        file_size=file_size,
        file_type=file_ext,
        status="Pending",
        uploaded_by=current_user.id,
        department_id=department_id,
        category_id=None # Set in pipeline
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    # Add audit log
    audit_log = models.AuditLog(
        user_id=current_user.id,
        action="DOCUMENT_UPLOAD",
        details=f"Uploaded document '{title}' (ID: {new_doc.id}, Type: {file_ext})",
        timestamp=datetime.datetime.utcnow()
    )
    db.add(audit_log)
    db.commit()

    # Trigger background ingestion pipeline
    # Pass db session maker wrapper to avoid cross-thread transaction conflicts in SQLite
    from app.database import SessionLocal
    background_tasks.add_task(
        process_document_pipeline, 
        new_doc.id, 
        save_path, 
        file_ext, 
        SessionLocal, 
        current_user.id
    )

    return new_doc

@router.get("", response_model=List[schemas.DocumentOut])
def list_documents(
    department_id: Optional[int] = None,
    category_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    query = db.query(models.Document)
    
    # Department filters based on RBAC:
    # Employees/Dept Admins can only see documents belonging to their departments,
    # unless it's a Super Admin who has global query permissions.
    user_role = current_user.role_rel.name if current_user.role_rel else ""
    if user_role != "Super Admin":
        query = query.filter(models.Document.department_id == current_user.department_id)
    elif department_id:
        query = query.filter(models.Document.department_id == department_id)
        
    if category_id:
        query = query.filter(models.Document.category_id == category_id)
    if status:
        query = query.filter(models.Document.status == status)
        
    return query.order_by(models.Document.created_at.desc()).all()

@router.get("/{document_id}", response_model=schemas.DocumentDetailOut)
def get_document_details(
    document_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Check department permissions
    user_role = current_user.role_rel.name if current_user.role_rel else ""
    if user_role != "Super Admin" and doc.department_id != current_user.department_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to documents outside your department."
        )
        
    return doc

@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    user_role = current_user.role_rel.name if current_user.role_rel else ""
    if user_role != "Super Admin" and doc.department_id != current_user.department_id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Original document file not found on disk")
        
    # Log download event
    audit_log = models.AuditLog(
        user_id=current_user.id,
        action="DOCUMENT_DOWNLOAD",
        details=f"Downloaded file '{doc.filename}' (ID: {doc.id})",
        timestamp=datetime.datetime.utcnow()
    )
    db.add(audit_log)
    db.commit()

    return FileResponse(
        path=doc.file_path,
        filename=doc.filename,
        media_type="application/octet-stream"
    )

@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Only Admin (Super or Department) can delete
    user_role = current_user.role_rel.name if current_user.role_rel else ""
    if user_role not in ["Super Admin", "Department Admin"]:
        raise HTTPException(status_code=403, detail="You do not have permission to delete documents.")

    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if user_role == "Department Admin" and doc.department_id != current_user.department_id:
        raise HTTPException(status_code=403, detail="You can only delete documents within your department.")

    # Remove physical file
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            logger.error(f"Error removing document file from path {doc.file_path}: {str(e)}")

    # Clean Knowledge Graph relationships of this doc node
    doc_node_id = f"doc_{doc.id}"
    db.query(models.KnowledgeGraphEdge).filter(
        (models.KnowledgeGraphEdge.source_node_id == doc_node_id) | 
        (models.KnowledgeGraphEdge.target_node_id == doc_node_id)
    ).delete(synchronize_session=False)
    
    db.query(models.KnowledgeGraphNode).filter(models.KnowledgeGraphNode.id == doc_node_id).delete(synchronize_session=False)

    # Remove vector collection entries
    collection = VectorService.get_collection()
    if collection and not settings.MOCK_AI_MODE:
        try:
            # Query all chunk ids
            chunk_ids = [f"doc_{doc.id}_chunk_{idx}" for idx in range(len(doc.embeddings))]
            if chunk_ids:
                collection.delete(ids=chunk_ids)
        except Exception as e:
            logger.error(f"Error removing vector entries for document {doc.id}: {str(e)}")

    # Delete db record
    db.delete(doc)
    
    # Audit log
    audit_log = models.AuditLog(
        user_id=current_user.id,
        action="DOCUMENT_DELETE",
        details=f"Deleted document '{doc.title}' (ID: {document_id})",
        timestamp=datetime.datetime.utcnow()
    )
    db.add(audit_log)
    db.commit()

    return {"detail": "Document and all analytical records deleted successfully"}
