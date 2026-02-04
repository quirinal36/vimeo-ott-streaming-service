import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Course, Enrollment } from '@/types/database'

interface EnrollmentWithCourse {
  course_id: string
  enrolled_at: string
  expires_at: string | null
  courses: Course | null
}

// 강의 목록 조회
export async function GET() {
  try {
    const supabase = await createClient()

    // 현재 사용자 확인
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    // 사용자가 등록한 수강 정보 조회
    const { data: enrollmentsData, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('course_id, enrolled_at, expires_at')
      .eq('user_id', user.id)

    if (enrollmentError) {
      console.error('Enrollments fetch error:', enrollmentError)
      return NextResponse.json(
        { error: '강의 목록을 가져오는데 실패했습니다.' },
        { status: 500 }
      )
    }

    const enrollments = (enrollmentsData || []) as Enrollment[]

    if (enrollments.length === 0) {
      return NextResponse.json({ courses: [] })
    }

    // 등록된 강의 ID 목록
    const courseIds = enrollments.map(e => e.course_id)

    // 강의 정보 조회
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .in('id', courseIds)

    if (coursesError) {
      console.error('Courses fetch error:', coursesError)
      return NextResponse.json(
        { error: '강의 목록을 가져오는데 실패했습니다.' },
        { status: 500 }
      )
    }

    const courses = (coursesData || []) as Course[]

    // 각 강의의 비디오 수와 시청 진도 계산
    const coursesWithProgress = await Promise.all(
      courses.map(async (course) => {
        const enrollment = enrollments.find(e => e.course_id === course.id)

        // 강의의 비디오 수 조회
        const { count: videoCount } = await supabase
          .from('videos')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id)

        // 해당 강의의 비디오 ID 목록 조회
        const { data: videosData } = await supabase
          .from('videos')
          .select('id')
          .eq('course_id', course.id)

        const videoIds = ((videosData || []) as { id: string }[]).map(v => v.id)

        // 시청 완료한 비디오 수 조회
        let completedCount = 0
        if (videoIds.length > 0) {
          const { count } = await supabase
            .from('watch_history')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_completed', true)
            .in('video_id', videoIds)

          completedCount = count || 0
        }

        return {
          ...course,
          enrolled_at: enrollment?.enrolled_at,
          expires_at: enrollment?.expires_at,
          video_count: videoCount || 0,
          completed_count: completedCount,
          progress: videoCount ? Math.round(completedCount / videoCount * 100) : 0,
        }
      })
    )

    return NextResponse.json({
      courses: coursesWithProgress,
    })
  } catch (error) {
    console.error('Courses fetch error:', error)
    return NextResponse.json(
      { error: '강의 목록을 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}
