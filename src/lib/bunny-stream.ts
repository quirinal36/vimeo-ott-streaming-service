import crypto from 'crypto'

interface SignedUrlOptions {
  videoId: string
  expiresInHours?: number
}

/**
 * Bunny CDN 토큰 인증 HLS URL 생성
 */
export function generateSignedUrl(options: SignedUrlOptions): string {
  const { videoId, expiresInHours = 2 } = options
  const tokenAuthKey = process.env.BUNNY_STREAM_TOKEN_AUTH_KEY
  const cdnHostname = process.env.BUNNY_VIDEO_LIBRARY_HOSTNAME

  if (!cdnHostname) {
    throw new Error('Bunny Stream CDN 호스트네임이 설정되지 않았습니다.')
  }

  const urlPath = `/${videoId}/playlist.m3u8`

  if (!tokenAuthKey) {
    return `https://${cdnHostname}${urlPath}`
  }

  const expires = Math.floor(Date.now() / 1000) + expiresInHours * 3600
  const hashableBase = tokenAuthKey + urlPath + expires
  const token = crypto.createHash('sha256').update(hashableBase).digest('base64url')

  return `https://${cdnHostname}${urlPath}?token=${token}&expires=${expires}`
}

/**
 * Bunny Stream iframe 임베드 URL 생성
 */
export function generateEmbedUrl(options: SignedUrlOptions): string {
  const { videoId, expiresInHours = 2 } = options
  const tokenAuthKey = process.env.BUNNY_STREAM_TOKEN_AUTH_KEY
  const libraryId = process.env.BUNNY_VIDEO_LIBRARY_ID

  if (!libraryId) {
    throw new Error('Bunny Stream Library ID가 설정되지 않았습니다.')
  }

  if (!tokenAuthKey) {
    return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`
  }

  const expires = Math.floor(Date.now() / 1000) + expiresInHours * 3600
  const hashableBase = tokenAuthKey + videoId + expires
  const token = crypto.createHash('sha256').update(hashableBase).digest('hex')

  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}`
}

/**
 * Bunny Stream API 비디오 정보 조회
 */
export async function getVideoInfo(videoId: string) {
  const apiKey = process.env.BUNNY_VIDEO_LIBRARY_API_KEY
  const libraryId = process.env.BUNNY_VIDEO_LIBRARY_ID

  if (!apiKey || !libraryId) {
    throw new Error('Bunny Stream API 설정이 필요합니다.')
  }

  const response = await fetch(
    `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
    { headers: { AccessKey: apiKey } }
  )

  if (!response.ok) {
    throw new Error('비디오 정보를 가져올 수 없습니다.')
  }

  return response.json()
}

/**
 * Bunny Stream API 비디오 목록 조회
 */
export async function listVideos() {
  const apiKey = process.env.BUNNY_VIDEO_LIBRARY_API_KEY
  const libraryId = process.env.BUNNY_VIDEO_LIBRARY_ID

  if (!apiKey || !libraryId) {
    throw new Error('Bunny Stream API 설정이 필요합니다.')
  }

  const response = await fetch(
    `https://video.bunnycdn.com/library/${libraryId}/videos`,
    { headers: { AccessKey: apiKey } }
  )

  if (!response.ok) {
    throw new Error('비디오 목록을 가져올 수 없습니다.')
  }

  const data = await response.json()
  return data.items
}
