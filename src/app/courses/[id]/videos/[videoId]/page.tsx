'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import VideoPlayer from '@/components/VideoPlayer'

interface VideoData {
  id: string
  title: string
  description: string | null
  duration_seconds: number | null
}

export default function VideoPlayerPage() {
  const params = useParams()
  const courseId = params.id as string
  const videoId = params.videoId as string

  const [video, setVideo] = useState<VideoData | null>(null)
  const [signedUrl, setSignedUrl] = useState('')
  const [initialProgress, setInitialProgress] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Signed URL 및 초기 데이터 가져오기
  const fetchData = useCallback(async () => {
    try {
      // Signed URL 가져오기
      const urlResponse = await fetch(`/api/videos/${videoId}/signed-url`, {
        method: 'POST',
      })

      if (!urlResponse.ok) {
        const data = await urlResponse.json()
        throw new Error(data.error || '영상을 불러올 수 없습니다.')
      }

      const urlData = await urlResponse.json()
      setVideo(urlData.video)
      setSignedUrl(urlData.signedUrl)

      // 이전 시청 위치 가져오기
      const progressResponse = await fetch(`/api/videos/${videoId}/progress`)
      if (progressResponse.ok) {
        const progressData = await progressResponse.json()
        if (progressData.watchHistory?.progress_seconds > 0) {
          setInitialProgress(progressData.watchHistory.progress_seconds)
        }
      }

      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '영상을 불러올 수 없습니다.')
      setLoading(false)
    }
  }, [videoId])

  // 시청 진도 저장
  const handleProgressUpdate = useCallback(async (currentTime: number, isCompleted: boolean) => {
    try {
      await fetch(`/api/videos/${videoId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          progress_seconds: Math.floor(currentTime),
          is_completed: isCompleted,
        }),
      })
    } catch (err) {
      console.error('Progress save error:', err)
    }
  }, [videoId])

  // 초기 데이터 로드
  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link
            href={`/courses/${courseId}`}
            className="text-blue-400 hover:text-blue-300"
          >
            강의 목록으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* 헤더 */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-4">
            <Link
              href={`/courses/${courseId}`}
              className="text-gray-400 hover:text-white"
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
            <h1 className="text-lg font-medium text-white truncate">
              {video?.title}
            </h1>
          </div>
        </div>
      </header>

      {/* 비디오 플레이어 */}
      <main className="max-w-6xl mx-auto">
        {signedUrl && video && (
          <VideoPlayer
            signedUrl={signedUrl}
            title={video.title}
            initialProgress={initialProgress}
            onProgressUpdate={handleProgressUpdate}
          />
        )}

        {/* 비디오 정보 */}
        <div className="px-4 py-6">
          <h2 className="text-xl font-bold text-white mb-2">{video?.title}</h2>
          {video?.description && (
            <p className="text-gray-400 mb-4">{video.description}</p>
          )}

          {/* 키보드 단축키 안내 */}
          <div className="mt-6 p-4 bg-gray-800 rounded-lg">
            <h3 className="text-sm font-medium text-gray-300 mb-3">키보드 단축키</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300">Space</kbd>
                <span className="text-gray-400">재생/일시정지</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300">J / L</kbd>
                <span className="text-gray-400">10초 이동</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300">M</kbd>
                <span className="text-gray-400">음소거</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300">F</kbd>
                <span className="text-gray-400">전체화면</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300">0-9</kbd>
                <span className="text-gray-400">구간 이동</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-gray-300">↑ / ↓</kbd>
                <span className="text-gray-400">볼륨 조절</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
