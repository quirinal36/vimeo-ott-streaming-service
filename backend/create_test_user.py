#!/usr/bin/env python3
"""
Gmail 도메인을 사용하는 테스트 사용자 생성
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Create test user with valid email domain
test_email = "teststudent123@gmail.com"
test_password = "StudentPass123!"

# Check if user exists
users = supabase.auth.admin.list_users()
user_exists = any(u.email == test_email for u in users)

if not user_exists:
    user_response = supabase.auth.admin.create_user({
        "email": test_email,
        "password": test_password,
        "email_confirm": True,
        "user_metadata": {"name": "Test Student Gmail"}
    })
    print(f"Created user: {test_email}")

    # Enroll in first course
    courses = supabase.table("courses").select("id").limit(1).execute()
    if courses.data:
        supabase.table("enrollments").insert({
            "user_id": user_response.user.id,
            "course_id": courses.data[0]["id"]
        }).execute()
        print("Enrolled in course")
else:
    print(f"User already exists: {test_email}")

print(f"\nTest credentials: {test_email} / {test_password}")
