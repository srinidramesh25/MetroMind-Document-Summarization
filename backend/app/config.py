import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from the root .env file
load_dotenv(dotenv_path=BASE_DIR.parent / ".env")


class Settings:
    PROJECT_NAME: str = "MetroMind AI"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "kmrl_metromind_ai_super_secure_secret_key_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Databases
    # SQLite default, can override with MySQL
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{BASE_DIR}/metromind.db"
    )
    CHROMA_DB_DIR: str = os.getenv(
        "CHROMA_DB_DIR",
        str(BASE_DIR / "chromadb_storage")
    )
    
    # Uploads
    UPLOAD_DIR: str = os.getenv(
        "UPLOAD_DIR",
        str(BASE_DIR / "uploads")
    )
    
    # AI Keys (Optional, system will use mock/local fallback if not set)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Force Mock Mode (useful for offline demonstration and testing)
    # Set to False when either OPENAI_API_KEY or GEMINI_API_KEY is configured
    MOCK_AI_MODE: bool = os.getenv("MOCK_AI_MODE", "True").lower() in ("true", "1", "yes")

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.CHROMA_DB_DIR, exist_ok=True)
