import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// 시청 진도 저장
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params
    const { progress_seconds, is_completed } = await request.json()
    const supabase = await createClient()

    // 현재 사용자 확인
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 비디오 정보 조회
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .select('course_id')
      .eq('id', videoId)
      .single()

    const video = videoData as { course_id: string } | null

    if (videoError || !video) {
      return NextResponse.json(
        { error: '비디오를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 수강 등록 확인
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', video.course_id)
      .single()

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        { error: '이 비디오에 대한 접근 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 시청 기록 업데이트 (upsert)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: watchHistory, error: historyError } = await (supabase
      .from('watch_history') as any)
      .upsert(
        {
          user_id: user.id,
          video_id: videoId,
          progress_seconds: progress_seconds || 0,
          is_completed: is_completed || false,
          last_watched_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,video_id',
        }
      )
      .select()
      .single()

    if (historyError) {
      console.error('Watch history update error:', historyError)
      return NextResponse.json(
        { error: '시청 기록 저장에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: '시청 기록이 저장되었습니다.',
      watchHistory,
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
    const supabase = await createClient()

    // 현재 사용자 확인
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const { data: watchHistory, error } = await supabase
      .from('watch_history')
      .select('*')
      .eq('user_id', user.id)
      .eq('video_id', videoId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Watch history fetch error:', error)
      return NextResponse.json(
        { error: '시청 기록을 가져오는데 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      watchHistory: watchHistory || {
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
