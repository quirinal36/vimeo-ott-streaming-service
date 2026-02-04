import { createClient } from '@/lib/supabase/server'
import { generateSignedUrl, generateEmbedUrl } from '@/lib/cloudflare-stream'
import { NextResponse } from 'next/server'
import type { Video, Enrollment } from '@/types/database'

// 비디오 Signed URL 발급
export async function POST(
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

    // 비디오 정보 조회
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single()

    const video = videoData as Video | null

    if (videoError || !video) {
      return NextResponse.json(
        { error: '비디오를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 수강 등록 확인
    const { data: enrollmentData, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', video.course_id)
      .single()

    const enrollment = enrollmentData as Enrollment | null

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        { error: '이 비디오에 대한 접근 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 수강 만료 확인
    if (enrollment.expires_at && new Date(enrollment.expires_at) < new Date()) {
      return NextResponse.json(
        { error: '수강 기간이 만료되었습니다.' },
        { status: 403 }
      )
    }

    // Signed URL 생성
    const signedUrl = generateSignedUrl({
      videoId: video.cloudflare_video_id,
      expiresInHours: 2,
      downloadable: false,
    })

    const embedUrl = generateEmbedUrl({
      videoId: video.cloudflare_video_id,
      expiresInHours: 2,
    })

    return NextResponse.json({
      signedUrl,
      embedUrl,
      video: {
        id: video.id,
        title: video.title,
        description: video.description,
        duration_seconds: video.duration_seconds,
      },
      expiresIn: 2 * 60 * 60, // 2시간 (초 단위)
    })
  } catch (error) {
    console.error('Signed URL generation error:', error)
    return NextResponse.json(
      { error: 'Signed URL 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}
