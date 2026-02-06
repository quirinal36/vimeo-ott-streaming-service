#!/usr/bin/env python3
"""
샘플 데이터 생성 스크립트
테스트용 강의, 비디오 데이터를 생성합니다.
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

print("Creating sample courses...")

# 샘플 강의 데이터
courses_data = [
    {
        "title": "웹 개발 기초",
        "description": "HTML, CSS, JavaScript를 배우는 기초 과정입니다. 웹 개발의 핵심 기술을 단계별로 학습합니다.",
        "thumbnail_url": "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400",
        "is_published": True,
    },
    {
        "title": "React 마스터 클래스",
        "description": "React의 고급 기능을 배우는 과정입니다. Hooks, Context, Redux 등을 다룹니다.",
        "thumbnail_url": "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400",
        "is_published": True,
    },
    {
        "title": "Python 백엔드 개발",
        "description": "FastAPI로 RESTful API를 개발하는 방법을 배웁니다.",
        "thumbnail_url": "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400",
        "is_published": True,
    },
]

# 기존 강의 확인
existing_courses = supabase.table("courses").select("title").execute()
existing_titles = {c["title"] for c in existing_courses.data} if existing_courses.data else set()

# 새 강의만 추가
new_courses = [c for c in courses_data if c["title"] not in existing_titles]

if new_courses:
    result = supabase.table("courses").insert(new_courses).execute()
    print(f"Created {len(result.data)} courses")
else:
    print("Courses already exist, skipping...")

# 강의 ID 조회
courses = supabase.table("courses").select("id, title").execute()
course_map = {c["title"]: c["id"] for c in courses.data}

print("\nCreating sample videos...")

# 샘플 비디오 데이터 (Bunny Stream 테스트 비디오 ID 사용)
# 실제 Bunny Stream 비디오 ID로 교체 필요
videos_data = [
    # 웹 개발 기초
    {
        "course_id": course_map.get("웹 개발 기초"),
        "title": "HTML 기초 - 웹 페이지의 구조",
        "description": "HTML 태그와 기본 구조를 배웁니다.",
        "bunny_video_id": "test-video-id-1",  # 실제 ID로 교체 필요
        "duration_seconds": 1800,
        "order_index": 1,
    },
    {
        "course_id": course_map.get("웹 개발 기초"),
        "title": "CSS 기초 - 스타일링의 시작",
        "description": "CSS를 사용하여 웹 페이지를 꾸미는 방법을 배웁니다.",
        "bunny_video_id": "test-video-id-2",
        "duration_seconds": 2100,
        "order_index": 2,
    },
    {
        "course_id": course_map.get("웹 개발 기초"),
        "title": "JavaScript 입문",
        "description": "JavaScript의 기본 문법을 배웁니다.",
        "bunny_video_id": "test-video-id-3",
        "duration_seconds": 2400,
        "order_index": 3,
    },
    # React 마스터 클래스
    {
        "course_id": course_map.get("React 마스터 클래스"),
        "title": "React Hooks 완벽 가이드",
        "description": "useState, useEffect 등 React Hooks를 마스터합니다.",
        "bunny_video_id": "test-video-id-4",
        "duration_seconds": 3600,
        "order_index": 1,
    },
    {
        "course_id": course_map.get("React 마스터 클래스"),
        "title": "Context API와 상태 관리",
        "description": "Context API를 사용한 전역 상태 관리를 배웁니다.",
        "bunny_video_id": "test-video-id-5",
        "duration_seconds": 2700,
        "order_index": 2,
    },
    # Python 백엔드 개발
    {
        "course_id": course_map.get("Python 백엔드 개발"),
        "title": "FastAPI 시작하기",
        "description": "FastAPI로 첫 API 서버를 만들어봅니다.",
        "bunny_video_id": "test-video-id-6",
        "duration_seconds": 2000,
        "order_index": 1,
    },
    {
        "course_id": course_map.get("Python 백엔드 개발"),
        "title": "Pydantic과 데이터 검증",
        "description": "Pydantic을 사용한 요청/응답 검증을 배웁니다.",
        "bunny_video_id": "test-video-id-7",
        "duration_seconds": 1500,
        "order_index": 2,
    },
]

# None course_id 필터링
videos_data = [v for v in videos_data if v["course_id"] is not None]

# 기존 비디오 확인
existing_videos = supabase.table("videos").select("bunny_video_id").execute()
existing_video_ids = {v["bunny_video_id"] for v in existing_videos.data} if existing_videos.data else set()

# 새 비디오만 추가
new_videos = [v for v in videos_data if v["bunny_video_id"] not in existing_video_ids]

if new_videos:
    result = supabase.table("videos").insert(new_videos).execute()
    print(f"Created {len(result.data)} videos")
else:
    print("Videos already exist, skipping...")

print("\n✅ Sample data creation complete!")
print("\nCurrent data summary:")

# 요약 출력
courses_count = supabase.table("courses").select("id", count="exact").execute()
videos_count = supabase.table("videos").select("id", count="exact").execute()

print(f"  - Courses: {courses_count.count}")
print(f"  - Videos: {videos_count.count}")
