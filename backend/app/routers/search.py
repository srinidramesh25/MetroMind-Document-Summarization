import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.database import get_db
from app import models, schemas, auth
from app.services.vector import VectorService
from app.config import settings

router = APIRouter(
    prefix="/search",
    tags=["Semantic Search Engine"]
)

@router.get("", response_model=schemas.SearchResponse)
def perform_search(
    q: str = Query(..., description="Search keyword or semantic query"),
    department_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # 1. Access controls: non-super-admins are restricted to their own department
    user_role = current_user.role_rel.name if current_user.role_rel else ""
    if user_role != "Super Admin":
        effective_department_id = current_user.department_id
    else:
        effective_department_id = department_id

    # 2. Run vector similarity search if collection is ready and not in mock mode
    vector_results = []
    if q.strip():
        vector_results = VectorService.query(q, n_results=10)

    # Convert vector results to dictionary map for easy scoring
    vector_score_map = {r["document_id"]: r for r in vector_results}

    # 3. Formulate SQL database queries for metadata filters and full-text matching fallback
    db_query = db.query(models.Document)
    
    # Filter by department
    if effective_department_id:
        db_query = db_query.filter(models.Document.department_id == effective_department_id)
    
    # Filter by category
    if category_id:
        db_query = db_query.filter(models.Document.category_id == category_id)
        
    # Filter by status
    if status:
        db_query = db_query.filter(models.Document.status == status)
        
    # Filter by date ranges
    if date_from:
        try:
            d_from = datetime.datetime.strptime(date_from, "%Y-%m-%d")
            db_query = db_query.filter(models.Document.created_at >= d_from)
        except ValueError:
            pass
            
    if date_to:
        try:
            d_to = datetime.datetime.strptime(date_to, "%Y-%m-%d") + datetime.timedelta(days=1)
            db_query = db_query.filter(models.Document.created_at <= d_to)
        except ValueError:
            pass

    # If vector database is not enabled/empty, run SQL fallback
    # Match against Document title or OCR result text
    matched_docs = []
    
    keywords = [kw.strip("?,.!-") for kw in q.split() if len(kw) > 2]
    if keywords:
        text_filters = []
        for kw in keywords[:4]:
            text_filters.append(models.Document.title.like(f"%{kw}%"))
            # Join with OCR Result text
            text_filters.append(models.Document.ocr_result.has(models.OCRResult.extracted_text.like(f"%{kw}%")))
        
        db_query = db_query.filter(or_(*text_filters))
        
    matched_docs = db_query.all()

    # 4. Score results and generate list items
    results = []
    for doc in matched_docs:
        # Default similarity score is word overlap if vector score is absent
        relevance_score = 0.50
        matching_snippet = ""
        
        # Check if vector DB has a score for this doc
        if doc.id in vector_score_map:
            relevance_score = vector_score_map[doc.id]["relevance_score"]
            matching_snippet = vector_score_map[doc.id]["chunk_text"]
        else:
            # Generate snippet from OCR text using keywords
            ocr = doc.ocr_result
            if ocr and ocr.extracted_text:
                extracted_text = ocr.extracted_text
                # Find matching keyword position to construct snippet
                found_pos = -1
                for kw in keywords:
                    idx = extracted_text.lower().find(kw.lower())
                    if idx != -1:
                        found_pos = idx
                        break
                
                if found_pos != -1:
                    start_idx = max(0, found_pos - 100)
                    end_idx = min(len(extracted_text), found_pos + 200)
                    matching_snippet = "..." + extracted_text[start_idx:end_idx].replace("\n", " ").strip() + "..."
                else:
                    matching_snippet = extracted_text[:200].replace("\n", " ").strip() + "..."
            else:
                matching_snippet = "No OCR text extracted yet. File is in status: " + doc.status
                
            # Basic word-match scorer for relevance
            match_count = 0
            for kw in keywords:
                if kw.lower() in doc.title.lower():
                    match_count += 2
                if ocr and ocr.extracted_text and kw.lower() in ocr.extracted_text.lower():
                    match_count += 1
            if keywords:
                overlap_ratio = match_count / (len(keywords) * 3)
                relevance_score = 0.40 + (0.50 * min(1.0, overlap_ratio))

        # Get summary bullet point
        summary_bullet = None
        if doc.summary and doc.summary.bullet_summary:
            # Return first bullet point
            bullets = doc.summary.bullet_summary.split("\n")
            if bullets:
                summary_bullet = bullets[0].strip("- *")

        results.append(schemas.SearchResultItem(
            document_id=doc.id,
            title=doc.title,
            file_type=doc.file_type,
            relevance_score=round(relevance_score, 2),
            matching_snippet=matching_snippet,
            summary_bullet=summary_bullet,
            department=doc.department_rel.name if doc.department_rel else "General"
        ))

    # Sort results by relevance score descending
    results.sort(key=lambda x: x.relevance_score, reverse=True)

    # Audit Search Logging
    audit_log = models.AuditLog(
        user_id=current_user.id,
        action="SEMANTIC_SEARCH",
        details=f"Searched for query: '{q}' (Matched: {len(results)} items)",
        timestamp=datetime.datetime.utcnow()
    )
    db.add(audit_log)
    db.commit()

    return {"results": results}
