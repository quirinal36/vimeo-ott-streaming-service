-- Cloudflare Stream → Bunny Stream 마이그레이션
-- 비디오 테이블 컬럼 리네임

ALTER TABLE videos RENAME COLUMN cloudflare_video_id TO bunny_video_id;
ALTER TABLE videos RENAME COLUMN cloudflare_thumbnail TO bunny_thumbnail;
