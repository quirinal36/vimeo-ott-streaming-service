"""
Bunny Video Library Referer 제한 설정 스크립트

Bunny CDN에 허용된 Referer(도메인)를 등록하여
등록되지 않은 도메인에서의 비디오 접근을 차단합니다.

사용법:
    python scripts/setup_referer.py

환경변수:
    BUNNY_STREAM_API_KEY - Bunny Account API Key
    BUNNY_VIDEO_LIBRARY_ID - Video Library ID
"""

import os
import sys

import httpx
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("BUNNY_STREAM_API_KEY")
LIBRARY_ID = os.getenv("BUNNY_VIDEO_LIBRARY_ID")

if not API_KEY or not LIBRARY_ID:
    print("Error: BUNNY_STREAM_API_KEY and BUNNY_VIDEO_LIBRARY_ID must be set")
    sys.exit(1)

BASE_URL = f"https://api.bunny.net/videolibrary/{LIBRARY_ID}"
HEADERS = {
    "AccessKey": API_KEY,
    "Content-Type": "application/json",
}

# 허용할 도메인 목록 (프로덕션 도메인 + 개발 환경)
ALLOWED_REFERRERS = [
    #"localhost"# 로컬 개발
    # 프로덕션 도메인을 아래에 추가하세요:
    "https://vimeo-ott-streaming-service-production.up.railway.app",
    # "www.yourdomain.com",
]


def add_allowed_referrer(hostname: str) -> bool:
    response = httpx.post(
        f"{BASE_URL}/addAllowedReferrer",
        headers=HEADERS,
        json={"Hostname": hostname},
    )
    if response.status_code == 204:
        print(f"  [OK] {hostname}")
        return True
    else:
        print(f"  [FAIL] {hostname} - {response.status_code}: {response.text}")
        return False


def get_library_info() -> dict:
    response = httpx.get(BASE_URL, headers=HEADERS)
    response.raise_for_status()
    return response.json()


def main():
    print(f"Video Library ID: {LIBRARY_ID}")
    print()

    # 현재 설정 조회
    info = get_library_info()
    current_referrers = info.get("AllowedReferrers", [])
    print(f"Current allowed referrers: {current_referrers or '(none)'}")
    print()

    # 새 도메인 추가
    print("Adding allowed referrers:")
    for hostname in ALLOWED_REFERRERS:
        if hostname in current_referrers:
            print(f"  [SKIP] {hostname} (already added)")
        else:
            add_allowed_referrer(hostname)

    print()

    # 최종 확인
    info = get_library_info()
    final_referrers = info.get("AllowedReferrers", [])
    print(f"Final allowed referrers: {final_referrers}")
    print()
    print("Done! Only requests from these domains can now access videos.")
    print("Note: Add your production domain to ALLOWED_REFERRERS and re-run this script before deploying.")


if __name__ == "__main__":
    main()
