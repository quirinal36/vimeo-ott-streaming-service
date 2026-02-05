import { NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/auth-helpers'
import { videosApi } from '@/lib/api-client'

// 비디오 Signed URL 발급
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params
    const token = await getAccessToken()

    if (!token) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // FastAPI 백엔드에서 Signed URL 발급
    const signedUrlResponse = await videosApi.getSignedUrl(videoId, token)

    if (signedUrlResponse.error) {
      return NextResponse.json(
        { error: signedUrlResponse.error },
        { status: signedUrlResponse.status }
      )
    }

    // 비디오 정보 조회
    const videoResponse = await videosApi.getById(videoId, token)

    const urlData = signedUrlResponse.data!
    const video = videoResponse.data

    return NextResponse.json({
      signedUrl: urlData.signed_url,
      embedUrl: urlData.iframe_url,
      video: video ? {
        id: video.id,
        title: video.title,
        description: video.description,
        duration_seconds: video.duration_seconds,
      } : null,
      expiresIn: urlData.expires_in,
    })
  } catch (error) {
    console.error('Signed URL generation error:', error)
    return NextResponse.json(
      { error: 'Signed URL 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}
