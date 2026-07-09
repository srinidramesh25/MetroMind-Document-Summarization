import re
import logging
from app.config import settings

logger = logging.getLogger(__name__)

class SummaryService:
    @staticmethod
    def generate_all_summaries(text: str) -> dict:
        """
        Generates executive, detailed, bullet, compliance summaries and action items.
        Tries OpenAI first, then Google Gemini, then falls back to local rule-based extractor.
        """
        # Clean text
        text = text.strip()
        if not text:
            return {
                "executive_summary": "Empty document. No text content to summarize.",
                "detailed_summary": "Empty document. No text content to summarize.",
                "bullet_summary": "- No content available.",
                "compliance_summary": "No compliance issues identified.",
                "action_items": "- None."
            }

        # --- Try OpenAI ---
        if settings.OPENAI_API_KEY and not settings.MOCK_AI_MODE:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                
                prompt = (
                    "You are the Lead Document Intelligence AI for Kochi Metro Rail Limited (KMRL).\n"
                    "Analyze the document text provided below and generate five distinct output blocks in JSON format.\n"
                    "Your JSON response must contain exactly these keys:\n"
                    "1. 'executive_summary': A high-level management executive overview (1-2 paragraphs).\n"
                    "2. 'detailed_summary': A complete, detailed explanation of the document contents.\n"
                    "3. 'bullet_summary': A bulleted list of the main points (markdown list format).\n"
                    "4. 'compliance_summary': Identification of compliance directives, regulations, standards, sections mentioned (Metro Railways Act, safety policies, HR rules, etc.).\n"
                    "5. 'action_items': A list of direct tasks, actions, responsible persons, deadlines, or warnings detected in the text (markdown list format).\n\n"
                    f"Document text:\n\"\"\"\n{text[:8000]}\n\"\"\"\n\n"
                    "Return ONLY the raw JSON string matching this structure without any markdown container block."
                )

                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are a professional enterprise metadata analyzer."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.2,
                    response_format={"type": "json_object"}
                )
                
                import json
                result = json.loads(response.choices[0].message.content)
                return {
                    "executive_summary": result.get("executive_summary", ""),
                    "detailed_summary": result.get("detailed_summary", ""),
                    "bullet_summary": result.get("bullet_summary", ""),
                    "compliance_summary": result.get("compliance_summary", ""),
                    "action_items": result.get("action_items", "")
                }
            except Exception as e:
                logger.error(f"Error in OpenAI summarization: {str(e)}. Trying Gemini...")

        # --- Try Google Gemini (free alternative) ---
        if settings.GEMINI_API_KEY and not settings.MOCK_AI_MODE:
            try:
                import google.generativeai as genai
                import json
                genai.configure(api_key=settings.GEMINI_API_KEY)
                model = genai.GenerativeModel("gemini-1.5-flash")

                prompt = (
                    "You are the Lead Document Intelligence AI for Kochi Metro Rail Limited (KMRL).\n"
                    "Analyze the document text below and return a JSON object with EXACTLY these 5 keys:\n"
                    "executive_summary, detailed_summary, bullet_summary, compliance_summary, action_items.\n"
                    "bullet_summary and action_items must use markdown list format (lines starting with - or - [ ]).\n"
                    "Return ONLY valid JSON, no markdown code fences.\n\n"
                    f"Document text:\n{text[:8000]}"
                )

                response = model.generate_content(prompt)
                raw = response.text.strip()
                # Strip any accidental markdown fences
                if raw.startswith("```"):
                    raw = re.sub(r"^```[a-z]*\n?", "", raw)
                    raw = re.sub(r"\n?```$", "", raw)
                result = json.loads(raw)
                return {
                    "executive_summary": result.get("executive_summary", ""),
                    "detailed_summary": result.get("detailed_summary", ""),
                    "bullet_summary": result.get("bullet_summary", ""),
                    "compliance_summary": result.get("compliance_summary", ""),
                    "action_items": result.get("action_items", "")
                }
            except Exception as e:
                logger.error(f"Error in Gemini summarization: {str(e)}. Falling back to local.")

        # Fallback Local Heuristic/NLP Summarizer
        return SummaryService._generate_local_summaries(text)

    @staticmethod
    def _generate_local_summaries(text: str) -> dict:
        sentences = re.split(r'(?<=[.!?])\s+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 5]
        
        # Executive Summary: First 3 sentences
        exec_summary = " ".join(sentences[:3])
        if len(exec_summary) < 50:
            exec_summary = text[:300] + "..."
            
        # Detailed Summary: The text itself limited, or key sentences
        detailed_summary = text[:2000]
        if len(text) > 2000:
            detailed_summary += "\n\n[Content truncated for detailed summary view]"
            
        # Bullet points: Grab top 5 sentences that contain keywords or just sequential
        bullets = []
        for s in sentences[:10]:
            if any(keyword in s.lower() for keyword in ["ensure", "must", "shall", "operational", "project", "approve", "contract"]):
                bullets.append(f"- {s}")
        if len(bullets) < 3:
            bullets = [f"- {s}" for s in sentences[:5]]
        bullet_summary = "\n".join(bullets)

        # Compliance Summary: Find lines mentioning compliance words
        compliance_points = []
        compliance_keywords = ["act", "comply", "compliance", "section", "directive", "legal", "standard", "regulation", "violation"]
        for s in sentences:
            if any(keyword in s.lower() for keyword in compliance_keywords):
                compliance_points.append(s)
                if len(compliance_points) >= 4:
                    break
        if compliance_points:
            compliance_summary = "Regulatory findings detected:\n" + "\n".join(f"- {p}" for p in compliance_points)
        else:
            compliance_summary = "The document was reviewed. No explicit mentions of regulatory sections, legal codes, or statutory compliance policies were detected. General operating guidelines apply."

        # Action items: Find lines with actions
        action_points = []
        action_keywords = ["must", "action", "schedule", "deadline", "todo", "task", "assign", "responsibility", "implement", "grind", "replace", "file", "verify"]
        for s in sentences:
            if any(keyword in s.lower() for keyword in action_keywords):
                # Clean up multiple spaces
                s_clean = re.sub(r'\s+', ' ', s)
                action_points.append(f"- [ ] {s_clean}")
                if len(action_points) >= 5:
                    break
        if not action_points:
            action_points = [
                "- [ ] Review document for general operational updates.",
                "- [ ] Verify implementation with department head."
            ]
        action_items = "\n".join(action_points)

        return {
            "executive_summary": exec_summary,
            "detailed_summary": detailed_summary,
            "bullet_summary": bullet_summary,
            "compliance_summary": compliance_summary,
            "action_items": action_items
        }
