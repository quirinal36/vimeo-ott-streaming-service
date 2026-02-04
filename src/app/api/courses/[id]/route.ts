import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Video, WatchHistory } from '@/types/database'

// 강의 상세 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // 현재 사용자 확인
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 수강 등록 확인
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', id)
      .single()

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        { error: '이 강의에 대한 접근 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 강의 정보 조회
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single()

    if (courseError || !course) {
      return NextResponse.json(
        { error: '강의를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 강의의 비디오 목록 조회 (순서대로)
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('*')
      .eq('course_id', id)
      .order('order_index', { ascending: true })

    if (videosError) {
      console.error('Videos fetch error:', videosError)
    }

    // 각 비디오의 시청 기록 조회
    const videosWithProgress = await Promise.all(
      ((videos || []) as Video[]).map(async (video) => {
        const { data } = await supabase
          .from('watch_history')
          .select('*')
          .eq('user_id', user.id)
          .eq('video_id', video.id)
          .single()

        const watchHistory = data as WatchHistory | null

        return {
          ...video,
          progress_seconds: watchHistory?.progress_seconds || 0,
          is_completed: watchHistory?.is_completed || false,
          last_watched_at: watchHistory?.last_watched_at || null,
        }
      })
    )

    return NextResponse.json({
      course,
      videos: videosWithProgress,
      enrollment,
    })
  } catch (error) {
    console.error('Course fetch error:', error)
    return NextResponse.json(
      { error: '강의 정보를 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}
