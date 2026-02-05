#!/usr/bin/env python3
"""
전체 API 테스트 스크립트
"""

import httpx

BASE_URL = "http://localhost:8000"

print("=== FastAPI Video Streaming API Test ===\n")

# 1. Health check
print("1. Health Check")
response = httpx.get(f"{BASE_URL}/health")
print(f"   Status: {response.status_code}")
print(f"   Response: {response.json()}")

# 2. Sign in
print("\n2. Sign In")
signin_response = httpx.post(
    f"{BASE_URL}/api/auth/signin",
    json={"email": "teststudent123@gmail.com", "password": "StudentPass123!"}
)
print(f"   Status: {signin_response.status_code}")

if signin_response.status_code != 200:
    print(f"   Error: {signin_response.json()}")
    exit(1)

auth_data = signin_response.json()
token = auth_data.get("access_token")
print(f"   User: {auth_data.get('user', {}).get('email')}")
print(f"   Token: {token[:50]}...")

headers = {"Authorization": f"Bearer {token}"}

# 3. Get profile
print("\n3. Get Profile (/api/auth/me)")
me_response = httpx.get(f"{BASE_URL}/api/auth/me", headers=headers)
print(f"   Status: {me_response.status_code}")
if me_response.status_code == 200:
    profile = me_response.json()
    print(f"   Name: {profile.get('name')}")
    print(f"   Role: {profile.get('role')}")
else:
    print(f"   Error: {me_response.json()}")

# 4. Get courses
print("\n4. Get My Courses (/api/courses)")
courses_response = httpx.get(f"{BASE_URL}/api/courses", headers=headers)
print(f"   Status: {courses_response.status_code}")
if courses_response.status_code == 200:
    courses = courses_response.json()
    print(f"   Enrolled Courses: {len(courses)}")
    for c in courses:
        print(f"   - {c['title']}")
else:
    print(f"   Error: {courses_response.json()}")

# 5. Get all courses
print("\n5. Get All Published Courses (/api/courses/all)")
all_courses_response = httpx.get(f"{BASE_URL}/api/courses/all", headers=headers)
print(f"   Status: {all_courses_response.status_code}")
if all_courses_response.status_code == 200:
    all_courses = all_courses_response.json()
    print(f"   Total Published Courses: {len(all_courses)}")
    course_id = all_courses[0]["id"] if all_courses else None
else:
    print(f"   Error: {all_courses_response.json()}")
    course_id = None

# 6. Get course detail (enrolled course)
if courses_response.status_code == 200 and courses:
    enrolled_course_id = courses[0]["id"]
    print(f"\n6. Get Course Detail (/api/courses/{enrolled_course_id})")
    detail_response = httpx.get(f"{BASE_URL}/api/courses/{enrolled_course_id}", headers=headers)
    print(f"   Status: {detail_response.status_code}")
    if detail_response.status_code == 200:
        detail = detail_response.json()
        print(f"   Title: {detail['title']}")
        print(f"   Videos: {len(detail.get('videos', []))}")
        for v in detail.get('videos', []):
            print(f"   - {v['title']} ({v.get('duration_seconds', 0)}s)")

        # 7. Get video signed URL
        if detail.get('videos'):
            video_id = detail['videos'][0]['id']
            print(f"\n7. Get Signed URL (/api/videos/{video_id}/signed-url)")
            signed_url_response = httpx.post(f"{BASE_URL}/api/videos/{video_id}/signed-url", headers=headers)
            print(f"   Status: {signed_url_response.status_code}")
            if signed_url_response.status_code == 200:
                url_data = signed_url_response.json()
                print(f"   Expires In: {url_data.get('expires_in')} seconds")
                print(f"   Signed URL: {url_data.get('signed_url', '')[:80]}...")
                print(f"   iframe URL: {url_data.get('iframe_url', '')[:80]}...")
            else:
                print(f"   Error: {signed_url_response.json()}")
    else:
        print(f"   Error: {detail_response.json()}")

print("\n=== API Test Complete ===")
