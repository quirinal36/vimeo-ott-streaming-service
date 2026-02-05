import { NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/auth-helpers'
import { coursesApi } from '@/lib/api-client'

// 강의 목록 조회
export async function GET() {
  try {
    const token = await getAccessToken()

    if (!token) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // FastAPI 백엔드에서 수강 등록된 강의 목록 조회
    const response = await coursesApi.getMyCourses(token)

    if (response.error) {
      return NextResponse.json(
        { error: response.error },
        { status: response.status }
      )
    }

    // 프론트엔드에서 기대하는 형식으로 변환
    const courses = response.data || []

    return NextResponse.json({
      courses: courses.map(course => ({
        ...course,
        video_count: 0, // TODO: 백엔드에서 포함하도록 개선
        completed_count: 0,
        progress: 0,
      })),
    })
  } catch (error) {
    console.error('Courses fetch error:', error)
    return NextResponse.json(
      { error: '강의 목록을 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}
