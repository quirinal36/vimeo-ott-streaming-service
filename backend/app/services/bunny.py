import hashlib
import base64
import time
from typing import List

import httpx

from app.config import settings


class BunnyStreamService:
    def __init__(self):
        self.api_key = settings.BUNNY_VIDEO_LIBRARY_API_KEY
        self.library_id = settings.BUNNY_VIDEO_LIBRARY_ID
        self.cdn_hostname = settings.BUNNY_VIDEO_LIBRARY_HOSTNAME
        self.token_auth_key = settings.BUNNY_STREAM_TOKEN_AUTH_KEY
        self.base_url = f"https://video.bunnycdn.com/library/{self.library_id}"

    def generate_signed_url(
        self,
        video_id: str,
        expires_in_hours: int = 2,
    ) -> str:
        """Bunny CDN 토큰 인증 HLS URL 생성"""
        if not self.token_auth_key:
            return f"https://{self.cdn_hostname}/{video_id}/playlist.m3u8"

        expiration_time = int(time.time()) + (expires_in_hours * 3600)
        url_path = f"/{video_id}/playlist.m3u8"
        hashable_base = self.token_auth_key + url_path + str(expiration_time)

        token = base64.b64encode(
            hashlib.sha256(hashable_base.encode()).digest()
        ).decode().replace("\n", "").replace("+", "-").replace("/", "_").replace("=", "")

        return f"https://{self.cdn_hostname}{url_path}?token={token}&expires={expiration_time}"

    def generate_iframe_url(
        self,
        video_id: str,
        expires_in_hours: int = 2,
    ) -> str:
        """Bunny Stream iframe 임베드 URL 생성"""
        if not self.token_auth_key:
            return f"https://iframe.mediadelivery.net/embed/{self.library_id}/{video_id}"

        expiration_time = int(time.time()) + (expires_in_hours * 3600)
        hashable_base = self.token_auth_key + video_id + str(expiration_time)
        token = hashlib.sha256(hashable_base.encode()).hexdigest()

        return f"https://iframe.mediadelivery.net/embed/{self.library_id}/{video_id}?token={token}&expires={expiration_time}"

    async def get_video_details(self, video_id: str) -> dict:
        """Bunny Stream 비디오 상세 정보 조회"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/videos/{video_id}",
                headers={"AccessKey": self.api_key},
            )
            response.raise_for_status()
            return response.json()

    async def list_videos(self) -> List[dict]:
        """Bunny Stream 비디오 목록 조회"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/videos",
                headers={"AccessKey": self.api_key},
                params={"itemsPerPage": 100},
            )
            response.raise_for_status()
            data = response.json()
            return data.get("items", [])

    async def create_video(self, title: str) -> dict:
        """Bunny Stream 비디오 객체 생성 (업로드 1단계)"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/videos",
                headers={
                    "AccessKey": self.api_key,
                    "Content-Type": "application/json",
                },
                json={"title": title},
            )
            response.raise_for_status()
            return response.json()

    def get_upload_url(self, video_id: str) -> str:
        """비디오 업로드 URL 반환 (업로드 2단계에서 사용)"""
        return f"{self.base_url}/videos/{video_id}"

    async def delete_video(self, video_id: str) -> bool:
        """Bunny Stream 비디오 삭제"""
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{self.base_url}/videos/{video_id}",
                headers={"AccessKey": self.api_key},
            )
            return response.status_code == 200

    def get_thumbnail_url(self, video_id: str) -> str:
        """비디오 썸네일 URL 반환"""
        return f"https://{self.cdn_hostname}/{video_id}/thumbnail.jpg"


bunny_service = BunnyStreamService()
