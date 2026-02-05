import base64
import time
from typing import Optional, List

import jwt
import httpx

from app.config import settings


class CloudflareStreamService:
    def __init__(self):
        self.account_id = settings.CLOUDFLARE_ACCOUNT_ID
        self.api_token = settings.CLOUDFLARE_API_TOKEN
        self.signing_key_id = settings.CLOUDFLARE_SIGNING_KEY_ID
        self.signing_key_pem = base64.b64decode(settings.CLOUDFLARE_SIGNING_KEY_PEM)
        self.customer_code = settings.CLOUDFLARE_CUSTOMER_CODE
        self.base_url = (
            f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/stream"
        )

    def generate_signed_url(
        self,
        video_id: str,
        expires_in_hours: int = 2,
        downloadable: bool = False,
        allowed_countries: Optional[List[str]] = None,
    ) -> str:
        """Signed URL 생성 (Signing Key 방식)"""

        exp = int(time.time()) + (expires_in_hours * 3600)

        # kid는 header에 포함
        headers = {
            "kid": self.signing_key_id,
        }

        payload = {
            "sub": video_id,
            "exp": exp,
            "downloadable": downloadable,
        }

        # 국가 제한 설정
        if allowed_countries:
            payload["accessRules"] = [
                {
                    "type": "ip.geoip.country",
                    "country": allowed_countries,
                    "action": "allow",
                },
                {"type": "any", "action": "block"},
            ]

        token = jwt.encode(payload, self.signing_key_pem, algorithm="RS256", headers=headers)

        return f"https://customer-{self.customer_code}.cloudflarestream.com/{video_id}/manifest/video.m3u8?token={token}"

    def generate_iframe_url(
        self,
        video_id: str,
        expires_in_hours: int = 2,
        downloadable: bool = False,
        allowed_countries: Optional[List[str]] = None,
    ) -> str:
        """Cloudflare Stream Player iframe URL 생성"""

        exp = int(time.time()) + (expires_in_hours * 3600)

        # kid는 header에 포함
        headers = {
            "kid": self.signing_key_id,
        }

        payload = {
            "sub": video_id,
            "exp": exp,
            "downloadable": downloadable,
        }

        if allowed_countries:
            payload["accessRules"] = [
                {
                    "type": "ip.geoip.country",
                    "country": allowed_countries,
                    "action": "allow",
                },
                {"type": "any", "action": "block"},
            ]

        token = jwt.encode(payload, self.signing_key_pem, algorithm="RS256", headers=headers)

        return f"https://customer-{self.customer_code}.cloudflarestream.com/{video_id}/iframe?token={token}"

    async def get_video_details(self, video_id: str) -> dict:
        """Cloudflare Stream에서 비디오 상세 정보 조회"""

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/{video_id}",
                headers={"Authorization": f"Bearer {self.api_token}"},
            )
            response.raise_for_status()
            return response.json()["result"]

    async def list_videos(self) -> List[dict]:
        """Cloudflare Stream의 모든 비디오 목록 조회"""

        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.base_url,
                headers={"Authorization": f"Bearer {self.api_token}"},
            )
            response.raise_for_status()
            return response.json()["result"]

    async def create_direct_upload(
        self,
        max_duration_seconds: int = 3600,
        require_signed_urls: bool = True,
        meta: Optional[dict] = None,
    ) -> dict:
        """Direct Creator Upload URL 생성"""

        payload = {
            "maxDurationSeconds": max_duration_seconds,
            "requireSignedURLs": require_signed_urls,
        }

        if meta:
            payload["meta"] = meta

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/direct_upload",
                headers={"Authorization": f"Bearer {self.api_token}"},
                json=payload,
            )
            response.raise_for_status()
            result = response.json()["result"]
            return {
                "upload_url": result["uploadURL"],
                "video_id": result["uid"],
            }

    async def create_tus_upload(
        self,
        file_size: int,
        max_duration_seconds: int = 3600,
        require_signed_urls: bool = True,
        meta: Optional[dict] = None,
    ) -> dict:
        """TUS 프로토콜 업로드 URL 생성 (대용량 파일용)"""

        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Tus-Resumable": "1.0.0",
            "Upload-Length": str(file_size),
            "Upload-Metadata": f"maxDurationSeconds {base64.b64encode(str(max_duration_seconds).encode()).decode()}, requiresignedurls {base64.b64encode(str(require_signed_urls).lower().encode()).decode()}",
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}",
                headers=headers,
            )
            response.raise_for_status()

            # Location 헤더에서 업로드 URL 추출
            upload_url = response.headers.get("Location", "")
            # stream-media-id 헤더에서 비디오 ID 추출
            video_id = response.headers.get("stream-media-id", "")

            return {
                "upload_url": upload_url,
                "video_id": video_id,
            }

    async def delete_video(self, video_id: str) -> bool:
        """Cloudflare Stream에서 비디오 삭제"""

        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{self.base_url}/{video_id}",
                headers={"Authorization": f"Bearer {self.api_token}"},
            )
            return response.status_code == 200


cloudflare_service = CloudflareStreamService()
