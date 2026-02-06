'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

interface VideoPlayerProps {
  embedUrl: string
  title: string
  initialProgress?: number
  onProgressUpdate?: (currentTime: number, isCompleted: boolean) => void
}

declare global {
  interface Window {
    playerjs: {
      Player: new (element: string | HTMLIFrameElement) => PlayerJsInstance
    }
  }
}

interface PlayerJsInstance {
  on(event: string, callback: (data?: any) => void): void
  off(event: string, callback?: (data?: any) => void): void
  play(): void
  pause(): void
  setCurrentTime(seconds: number): void
  getCurrentTime(callback: (seconds: number) => void): void
  getDuration(callback: (duration: number) => void): void
  setVolume(volume: number): void
  getVolume(callback: (volume: number) => void): void
  mute(): void
  unmute(): void
  getMuted(callback: (muted: boolean) => void): void
}

export default function VideoPlayer({
  embedUrl,
  title,
  initialProgress = 0,
  onProgressUpdate,
}: VideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const playerRef = useRef<PlayerJsInstance | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const startProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }

    if (!onProgressUpdate || !playerRef.current) return

    progressIntervalRef.current = setInterval(() => {
      playerRef.current?.getCurrentTime((seconds) => {
        onProgressUpdate(seconds, false)
      })
    }, 10000)
  }, [onProgressUpdate])

  const stopProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!embedUrl) return

    // Player.js 스크립트 로드
    const existingScript = document.querySelector(
      'script[src*="playerjs"]'
    )

    const initPlayer = () => {
      if (!iframeRef.current || !window.playerjs) return

      const player = new window.playerjs.Player(iframeRef.current)
      playerRef.current = player

      player.on('ready', () => {
        setIsLoading(false)

        // 이전 시청 위치로 이동
        if (initialProgress > 0) {
          player.setCurrentTime(initialProgress)
        }

        // 재생/일시정지 이벤트에서 진도 추적 시작/중지
        player.on('play', () => {
          startProgressTracking()
        })

        player.on('pause', () => {
          stopProgressTracking()
          // 일시정지 시 현재 위치 저장
          player.getCurrentTime((seconds) => {
            onProgressUpdate?.(seconds, false)
          })
        })

        // 재생 완료
        player.on('ended', () => {
          stopProgressTracking()
          player.getDuration((duration) => {
            onProgressUpdate?.(duration, true)
          })
        })

        player.on('error', () => {
          setError('영상을 재생할 수 없습니다.')
          stopProgressTracking()
        })
      })
    }

    if (existingScript && window.playerjs) {
      initPlayer()
    } else if (!existingScript) {
      const script = document.createElement('script')
      script.src = 'https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js'
      script.async = true
      script.onload = initPlayer
      script.onerror = () => setError('플레이어를 불러올 수 없습니다.')
      document.head.appendChild(script)
    }

    return () => {
      stopProgressTracking()
      playerRef.current = null
    }
  }, [embedUrl, initialProgress, onProgressUpdate, startProgressTracking, stopProgressTracking])

  if (error) {
    return (
      <div className="aspect-video bg-black flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="relative aspect-video bg-black">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title={title}
        className="w-full h-full"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  )
}
