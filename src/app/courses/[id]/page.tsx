'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Video {
  id: string
  title: string
  description: string | null
  duration_seconds: number | null
  order_index: number
  progress_seconds: number
  is_completed: boolean
}

interface Course {
  id: string
  title: string
  description: string | null
}

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string

  const [course, setCourse] = useState<Course | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}`)

        if (!response.ok) {
          if (response.status === 403) {
            setError('이 강의에 대한 접근 권한이 없습니다.')
          } else if (response.status === 404) {
            setError('강의를 찾을 수 없습니다.')
          } else {
            setError('강의 정보를 불러오는데 실패했습니다.')
          }
          return
        }

        const data = await response.json()
        setCourse(data.course)
        setVideos(data.videos || [])
      } catch (err) {
        setError('강의 정보를 불러오는데 실패했습니다.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchCourse()
  }, [courseId])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            href="/courses"
            className="text-blue-600 hover:text-blue-800"
          >
            강의 목록으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  const completedCount = videos.filter(v => v.is_completed).length
  const progress = videos.length > 0 ? Math.round((completedCount / videos.length) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/courses"
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">
                {course?.title}
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 강의 정보 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          {course?.description && (
            <p className="text-gray-600 mb-4">{course.description}</p>
          )}

          {/* 전체 진도 */}
          <div className="border-t pt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>전체 진도</span>
              <span>{completedCount} / {videos.length} 강의 완료 ({progress}%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 비디오 목록 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-gray-900">강의 목록</h2>
          </div>

          {videos.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              아직 등록된 영상이 없습니다.
            </div>
          ) : (
            <ul className="divide-y">
              {videos.map((video, index) => (
                <li key={video.id}>
                  <Link
                    href={`/courses/${courseId}/videos/${video.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                  >
                    {/* 순서 / 완료 표시 */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      video.is_completed
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {video.is_completed ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>

                    {/* 비디오 정보 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {video.title}
                      </h3>
                      {video.description && (
                        <p className="text-sm text-gray-500 truncate">
                          {video.description}
                        </p>
                      )}
                    </div>

                    {/* 재생 시간 */}
                    <div className="text-sm text-gray-500">
                      {formatDuration(video.duration_seconds)}
                    </div>

                    {/* 재생 버튼 */}
                    <div className="text-blue-600">
                      <svg
                        className="w-6 h-6"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
