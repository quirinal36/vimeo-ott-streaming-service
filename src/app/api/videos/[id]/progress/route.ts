import { NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/auth-helpers'
import { videosApi } from '@/lib/api-client'

// 시청 진도 저장
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params
    const { progress_seconds, is_completed } = await request.json()
    const token = await getAccessToken()

    if (!token) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // FastAPI 백엔드로 시청 진도 업데이트
    const response = await videosApi.updateProgress(
      videoId,
      progress_seconds || 0,
      is_completed || false,
      token
    )

    if (response.error) {
      return NextResponse.json(
        { error: response.error },
        { status: response.status }
      )
    }

    return NextResponse.json({
      message: '시청 기록이 저장되었습니다.',
      watchHistory: {
        progress_seconds: progress_seconds || 0,
        is_completed: is_completed || false,
      },
    })
  } catch (error) {
    console.error('Progress save error:', error)
    return NextResponse.json(
      { error: '시청 기록 저장에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// 시청 진도 조회
export async function GET(
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

    // FastAPI 백엔드에서 시청 진도 조회
    const response = await videosApi.getProgress(videoId, token)

    if (response.error && response.status !== 404) {
      return NextResponse.json(
        { error: response.error },
        { status: response.status }
      )
    }

    return NextResponse.json({
      watchHistory: response.data || {
        progress_seconds: 0,
        is_completed: false,
      },
    })
  } catch (error) {
    console.error('Progress fetch error:', error)
    return NextResponse.json(
      { error: '시청 기록을 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}
