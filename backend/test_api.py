#!/usr/bin/env python3
"""
API 테스트 스크립트
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

# Service role key로 RLS 우회
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

print("=== Testing Supabase Connection ===\n")

# 1. 프로필 목록 확인
print("1. Profiles:")
profiles = supabase.table("profiles").select("*").execute()
for p in profiles.data or []:
    print(f"   - {p['email']} (role: {p['role']})")

# 2. 강의 목록 확인
print("\n2. Courses:")
courses = supabase.table("courses").select("*").execute()
for c in courses.data or []:
    print(f"   - {c['title']} (published: {c['is_published']})")

# 3. 비디오 목록 확인
print("\n3. Videos:")
videos = supabase.table("videos").select("*, courses(title)").execute()
for v in videos.data or []:
    course_title = v.get('courses', {}).get('title', 'Unknown')
    print(f"   - [{course_title}] {v['title']}")

# 4. 테스트 사용자 생성 (관리자)
print("\n4. Creating test admin user...")
test_email = "admin@test.local"
test_password = "AdminPass123!"

# 기존 사용자 확인
existing_user = supabase.auth.admin.list_users()
admin_exists = any(u.email == test_email for u in existing_user)

if not admin_exists:
    try:
        # 관리자 사용자 생성
        user_response = supabase.auth.admin.create_user({
            "email": test_email,
            "password": test_password,
            "email_confirm": True,
            "user_metadata": {"name": "Admin User"}
        })

        if user_response.user:
            # 관리자 역할 부여
            supabase.table("profiles").update({"role": "admin"}).eq("id", user_response.user.id).execute()
            print(f"   Created admin user: {test_email}")
    except Exception as e:
        print(f"   Error creating admin: {e}")
else:
    print(f"   Admin user already exists: {test_email}")

# 5. 테스트 학생 사용자 생성
print("\n5. Creating test student user...")
student_email = "student@test.local"
student_password = "StudentPass123!"

student_exists = any(u.email == student_email for u in existing_user)

if not student_exists:
    try:
        user_response = supabase.auth.admin.create_user({
            "email": student_email,
            "password": student_password,
            "email_confirm": True,
            "user_metadata": {"name": "Test Student"}
        })

        if user_response.user:
            print(f"   Created student user: {student_email}")

            # 첫 번째 강의에 수강 등록
            if courses.data:
                supabase.table("enrollments").insert({
                    "user_id": user_response.user.id,
                    "course_id": courses.data[0]["id"]
                }).execute()
                print(f"   Enrolled in: {courses.data[0]['title']}")
    except Exception as e:
        print(f"   Error creating student: {e}")
else:
    print(f"   Student user already exists: {student_email}")

print("\n=== Test Credentials ===")
print(f"Admin:   {test_email} / {test_password}")
print(f"Student: {student_email} / {student_password}")

print("\n=== Test API with curl ===")
print(f'''
# Login as admin:
curl -X POST http://localhost:8000/api/auth/signin \\
  -H "Content-Type: application/json" \\
  -d '{{"email": "{test_email}", "password": "{test_password}"}}'

# Login as student:
curl -X POST http://localhost:8000/api/auth/signin \\
  -H "Content-Type: application/json" \\
  -d '{{"email": "{student_email}", "password": "{student_password}"}}'
''')
