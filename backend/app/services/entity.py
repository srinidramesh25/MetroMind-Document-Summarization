import re
import logging
from app.config import settings

logger = logging.getLogger(__name__)

class EntityService:
    @staticmethod
    def extract_entities(text: str) -> list:
        """
        Parses text and extracts named entities.
        Returns a list of dicts: [{"type": str, "value": str, "confidence": float, "metadata": dict}]
        """
        if not text.strip():
            return []

        if settings.OPENAI_API_KEY and not settings.MOCK_AI_MODE:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                
                prompt = (
                    "Extract entities from this text. We need 8 specific entity types:\n"
                    "1. Person (names of employees, directors, officers)\n"
                    "2. Organization (vendors, agencies, departments)\n"
                    "3. Location (stations, depots, towns)\n"
                    "4. Date (deadlines, creation dates)\n"
                    "5. ContractNumber (contract reference numbers)\n"
                    "6. ReferenceID (document identifiers, circular codes)\n"
                    "7. MonetaryValue (sums of money mentioned)\n"
                    "8. ProjectName (Phase 1, viaduct upgrades, signaling projects)\n\n"
                    f"Text:\n\"\"\"\n{text[:6000]}\n\"\"\"\n\n"
                    "Return a JSON array of objects where each object has these exact keys: 'type', 'value', 'confidence'. Do not wrap in markdown containers."
                )

                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are a professional named entity recognizer (NER) for metro documents."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.1
                )
                
                import json
                cleaned_content = response.choices[0].message.content.strip()
                if cleaned_content.startswith("```json"):
                    cleaned_content = cleaned_content.split("```json")[1].split("```")[0].strip()
                elif cleaned_content.startswith("```"):
                    cleaned_content = cleaned_content.split("```")[1].split("```")[0].strip()
                
                entities = json.loads(cleaned_content)
                # Map metadata if missing
                for ent in entities:
                    ent["metadata"] = {}
                return entities
            except Exception as e:
                logger.error(f"Error in OpenAI entity extraction: {str(e)}")

        # Local Regex / Keyword Extractor (Robust, Offline-capable)
        return EntityService._extract_local_entities(text)

    @staticmethod
    def _extract_local_entities(text: str) -> list:
        entities = []
        
        # Regex mappings
        regex_patterns = {
            "MonetaryValue": r"(?:Rs\.?|INR|₹|Indian Rupees)\s*\d+(?:\.\d+)?\s*(?:Crore|Lakh|Million|Billion|Cr|L)?|\b\d+(?:,\d+)*(?:\.\d+)?\s*(?:Crores|Lakhs|L|Cr)\b",
            "ReferenceID": r"\b[A-Z]{2,5}-[A-Z0-9\-]{4,15}\b|Ref:\s*[A-Z0-9\-/]+",
            "Date": r"\b\d{1,2}[-/](?:\d{1,2}|[a-zA-Z]{3,9})[-/]\d{2,4}\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b",
            "ContractNumber": r"\bCONT-\d{4}-\d{3,6}\b|Contract No:\s*[A-Z0-9\-/]+"
        }

        # Apply regex rules
        for ent_type, pattern in regex_patterns.items():
            matches = re.finditer(pattern, text, re.IGNORECASE)
            seen = set()
            for m in matches:
                val = m.group(0).strip()
                if val.lower() not in seen and len(val) > 2:
                    seen.add(val.lower())
                    # Clean prefix/suffix from standard searches
                    if ent_type == "ReferenceID" and val.lower().startswith("ref:"):
                        val = val[4:].strip()
                    entities.append({
                        "type": ent_type,
                        "value": val,
                        "confidence": 0.90,
                        "metadata": {}
                    })

        # Dictionary lookup for common KMRL structural entities
        dict_patterns = {
            "Location": [
                "Aluva", "Tripunithura", "Muttom", "Muttom Depot", "Edappally", "Vytila", 
                "Palarivattom", "Ernakulam South", "MG Road", "Kadavanthra", "Jawaharlal Nehru Stadium",
                "Kochi viaduct", "Kochi"
            ],
            "Organization": [
                "KMRL", "Kochi Metro Rail Limited", "L&T Infrastructure Services", "L&T", 
                "Alstom Transportation India", "Alstom", "Siemens Mobility Solutions", "Siemens",
                "KEC International", "DMRC", "COPT"
            ],
            "Person": [
                "Rajendran Pillai", "Lekshmi Nair", "Manoj Kumar", "Anupama V.", "Loknath Behera",
                "Alkesh Kumar Sharma", "Shri. Rajendran Pillai", "Smt. Lekshmi Nair", "Dr. Manoj Kumar"
            ],
            "ProjectName": [
                "Phase 2 Extention", "Phase 1 Extension", "Viaduct Track Construction", 
                "Signalling Upgrade", "Overhead Electrification (OHE)", "Phase 2 Civil Works",
                "Monsoon Safety Upgrades"
            ]
        }

        for ent_type, terms in dict_patterns.items():
            seen = set()
            for term in terms:
                # Use word boundaries or simple sub-matches
                pattern = r'\b' + re.escape(term) + r'\b'
                if re.search(pattern, text, re.IGNORECASE):
                    val = term
                    # Check case matching or keep default term case
                    m = re.search(pattern, text, re.IGNORECASE)
                    if m:
                        val = m.group(0) # Keep exact string formatting from text
                    if val.lower() not in seen:
                        seen.add(val.lower())
                        entities.append({
                            "type": ent_type,
                            "value": val,
                            "confidence": 0.95,
                            "metadata": {}
                        })

        # Return unique results ordered by type
        return entities
