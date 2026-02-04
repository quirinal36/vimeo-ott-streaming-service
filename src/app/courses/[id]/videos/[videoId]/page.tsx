'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Hls from 'hls.js'

interface VideoData {
  id: string
  title: string
  description: string | null
  duration_seconds: number | null
}

export default function VideoPlayerPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string
  const videoId = params.videoId as string

  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const [video, setVideo] = useState<VideoData | null>(null)
  const [signedUrl, setSignedUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Signed URL 가져오기
  const fetchSignedUrl = useCallback(async () => {
    try {
      const response = await fetch(`/api/videos/${videoId}/signed-url`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '영상을 불러올 수 없습니다.')
      }

      const data = await response.json()
      setVideo(data.video)
      setSignedUrl(data.signedUrl)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '영상을 불러올 수 없습니다.')
      setLoading(false)
    }
  }, [videoId])

  // 시청 진도 저장
  const saveProgress = useCallback(async (progressSeconds: number, isCompleted: boolean = false) => {
    try {
      await fetch(`/api/videos/${videoId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          progress_seconds: Math.floor(progressSeconds),
          is_completed: isCompleted,
        }),
      })
    } catch (err) {
      console.error('Progress save error:', err)
    }
  }, [videoId])

  // 이전 시청 위치 가져오기
  const fetchProgress = useCallback(async () => {
    try {
      const response = await fetch(`/api/videos/${videoId}/progress`)
      if (response.ok) {
        const data = await response.json()
        if (data.watchHistory?.progress_seconds > 0) {
          setCurrentTime(data.watchHistory.progress_seconds)
          // 비디오가 로드된 후 이전 위치로 이동
          if (videoRef.current) {
            videoRef.current.currentTime = data.watchHistory.progress_seconds
          }
        }
      }
    } catch (err) {
      console.error('Progress fetch error:', err)
    }
  }, [videoId])

  // HLS 플레이어 초기화
  useEffect(() => {
    if (!signedUrl || !videoRef.current) return

    const video = videoRef.current

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      })

      hls.loadSource(signedUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // 이전 시청 위치로 이동
        fetchProgress()
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('네트워크 오류, 재시도 중...')
              hls.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('미디어 오류, 복구 중...')
              hls.recoverMediaError()
              break
            default:
              setError('영상을 재생할 수 없습니다.')
              hls.destroy()
              break
          }
        }
      })

      hlsRef.current = hls

      return () => {
        hls.destroy()
      }
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari 네이티브 HLS 지원
      video.src = signedUrl
      fetchProgress()
    }
  }, [signedUrl, fetchProgress])

  // 주기적으로 진도 저장 (10초마다)
  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        if (videoRef.current) {
          saveProgress(videoRef.current.currentTime)
        }
      }, 10000)
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [isPlaying, saveProgress])

  // 컴포넌트 언마운트 시 진도 저장
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        saveProgress(videoRef.current.currentTime)
      }
    }
  }, [saveProgress])

  // 초기 데이터 로드
  useEffect(() => {
    fetchSignedUrl()
  }, [fetchSignedUrl])

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
      setDuration(videoRef.current.duration)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    saveProgress(duration, true) // 완료 표시
  }

  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => {
    setIsPlaying(false)
    if (videoRef.current) {
      saveProgress(videoRef.current.currentTime)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

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
        <div className="aspect-video bg-black">
          <video
            ref={videoRef}
            className="w-full h-full"
            controls
            autoPlay
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onPlay={handlePlay}
            onPause={handlePause}
          />
        </div>

        {/* 비디오 정보 */}
        <div className="px-4 py-6">
          <h2 className="text-xl font-bold text-white mb-2">{video?.title}</h2>
          {video?.description && (
            <p className="text-gray-400">{video.description}</p>
          )}

          {/* 진도 표시 */}
          <div className="mt-4 text-sm text-gray-500">
            {formatTime(currentTime)} / {formatTime(duration || video?.duration_seconds || 0)}
          </div>
        </div>
      </main>
    </div>
  )
}
