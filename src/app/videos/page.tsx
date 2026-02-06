'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { VideoListSkeleton } from '@/components/Skeleton'

interface Video {
  id: string
  title: string
  description: string | null
  bunny_thumbnail: string | null
  duration_seconds: number | null
  order_index: number
  course_id: string
  courses: {
    id: string
    title: string
  }
}

interface WatchHistory {
  video_id: string
  progress_seconds: number
  is_completed: boolean
}

export default function VideosPage() {
  const router = useRouter()
  const [videos, setVideos] = useState<Video[]>([])
  const [watchHistory, setWatchHistory] = useState<Map<string, WatchHistory>>(new Map())
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'completed'>('all')
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 현재 사용자 확인
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/login?redirectTo=/videos')
          return
        }

        // 사용자가 등록한 강의의 비디오 목록 가져오기
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('course_id')
          .eq('user_id', user.id)

        if (!enrollments || enrollments.length === 0) {
          setLoading(false)
          return
        }

        const courseIds = (enrollments as { course_id: string }[]).map(e => e.course_id)

        // 비디오 목록
        const { data: videosData } = await supabase
          .from('videos')
          .select(`
            id,
            title,
            description,
            bunny_thumbnail,
            duration_seconds,
            order_index,
            course_id,
            courses (
              id,
              title
            )
          `)
          .in('course_id', courseIds)
          .order('order_index')

        // 시청 기록
        const { data: historyData } = await supabase
          .from('watch_history')
          .select('video_id, progress_seconds, is_completed')
          .eq('user_id', user.id)

        if (videosData) {
          setVideos(videosData as unknown as Video[])
        }

        if (historyData) {
          const historyMap = new Map<string, WatchHistory>()
          ;(historyData as WatchHistory[]).forEach(h => historyMap.set(h.video_id, h))
          setWatchHistory(historyMap)
        }
      } catch (error) {
        console.error('Failed to fetch videos:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase, router])

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getProgress = (videoId: string, duration: number | null) => {
    const history = watchHistory.get(videoId)
    if (!history || !duration) return 0
    return Math.min((history.progress_seconds / duration) * 100, 100)
  }

  const isCompleted = (videoId: string) => {
    return watchHistory.get(videoId)?.is_completed || false
  }

  const isInProgress = (videoId: string) => {
    const history = watchHistory.get(videoId)
    return history && history.progress_seconds > 0 && !history.is_completed
  }

  const filteredVideos = videos.filter(video => {
    if (filter === 'completed') return isCompleted(video.id)
    if (filter === 'in-progress') return isInProgress(video.id)
    return true
  })

  // 강의별로 그룹화
  const videosByCoure = filteredVideos.reduce((acc, video) => {
    const courseTitle = video.courses?.title || '기타'
    if (!acc[courseTitle]) {
      acc[courseTitle] = []
    }
    acc[courseTitle].push(video)
    return acc
  }, {} as Record<string, Video[]>)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="mt-4 flex gap-2">
              <div className="h-10 w-20 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-10 w-20 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-10 w-20 bg-gray-200 rounded-full animate-pulse" />
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <VideoListSkeleton count={8} />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">내 비디오 라이브러리</h1>
              <p className="mt-1 text-sm text-gray-500">
                수강 중인 모든 강의의 비디오를 한 곳에서 확인하세요
              </p>
            </div>
            <Link
              href="/courses"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              강의 목록으로 →
            </Link>
          </div>

          {/* 필터 */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              전체 ({videos.length})
            </button>
            <button
              onClick={() => setFilter('in-progress')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === 'in-progress'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              시청 중 ({videos.filter(v => isInProgress(v.id)).length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === 'completed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              완료 ({videos.filter(v => isCompleted(v.id)).length})
            </button>
          </div>
        </div>
      </header>

      {/* 비디오 목록 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {videos.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">비디오가 없습니다</h3>
            <p className="mt-1 text-sm text-gray-500">
              강의에 등록하면 비디오가 여기에 표시됩니다.
            </p>
            <div className="mt-6">
              <Link
                href="/courses"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                강의 둘러보기
              </Link>
            </div>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">해당하는 비디오가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(videosByCoure).map(([courseTitle, courseVideos]) => (
              <div key={courseTitle}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {courseTitle}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {courseVideos.map((video) => {
                    const progress = getProgress(video.id, video.duration_seconds)
                    const completed = isCompleted(video.id)

                    return (
                      <Link
                        key={video.id}
                        href={`/courses/${video.course_id}/videos/${video.id}`}
                        className="group bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                      >
                        {/* 썸네일 */}
                        <div className="relative aspect-video bg-gray-200">
                          {video.bunny_thumbnail ? (
                            <Image
                              src={video.bunny_thumbnail}
                              alt={video.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <svg
                                className="w-12 h-12 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            </div>
                          )}

                          {/* 재생 오버레이 */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                            <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <svg
                                className="w-6 h-6 text-gray-900 ml-1"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>

                          {/* 시간 표시 */}
                          <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                            {formatDuration(video.duration_seconds)}
                          </div>

                          {/* 완료 표시 */}
                          {completed && (
                            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              완료
                            </div>
                          )}

                          {/* 진도 바 */}
                          {progress > 0 && !completed && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-300">
                              <div
                                className="h-full bg-blue-600"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          )}
                        </div>

                        {/* 정보 */}
                        <div className="p-4">
                          <h3 className="font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600">
                            {video.title}
                          </h3>
                          {video.description && (
                            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                              {video.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
