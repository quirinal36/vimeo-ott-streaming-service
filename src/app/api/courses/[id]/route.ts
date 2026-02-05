import { NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/auth-helpers'
import { coursesApi } from '@/lib/api-client'

// 강의 상세 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = await getAccessToken()

    if (!token) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // FastAPI 백엔드에서 강의 상세 정보 조회
    const courseResponse = await coursesApi.getById(id, token)

    if (courseResponse.error) {
      return NextResponse.json(
        { error: courseResponse.error },
        { status: courseResponse.status }
      )
    }

    // 비디오 목록 (시청 진도 포함)
    const videosResponse = await coursesApi.getVideos(id, token)

    const course = courseResponse.data
    const videos = videosResponse.data || []

    return NextResponse.json({
      course,
      videos: videos.map(video => ({
        ...video,
        last_watched_at: null,
      })),
      enrollment: {
        course_id: id,
        enrolled_at: new Date().toISOString(),
        expires_at: null,
      },
    })
  } catch (error) {
    console.error('Course fetch error:', error)
    return NextResponse.json(
      { error: '강의 정보를 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}
