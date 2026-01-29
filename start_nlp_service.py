#!/usr/bin/env python3
"""
Startup script for NLP service
"""
import uvicorn
from nlp_service import app

if __name__ == "__main__":
    print("🚀 Starting Water Infrastructure NLP Service...")
    print("📡 Service will be available at: http://localhost:8001")
    print("📚 API Documentation: http://localhost:8001/docs")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        log_level="info",
        reload=False
    )