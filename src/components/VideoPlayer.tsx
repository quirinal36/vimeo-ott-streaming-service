'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Hls from 'hls.js'

interface VideoPlayerProps {
  signedUrl: string
  title: string
  initialProgress?: number
  onProgressUpdate?: (currentTime: number, isCompleted: boolean) => void
}

interface QualityLevel {
  height: number
  bitrate: number
  name: string
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

export default function VideoPlayer({
  signedUrl,
  title,
  initialProgress = 0,
  onProgressUpdate,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [buffered, setBuffered] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([])
  const [currentQuality, setCurrentQuality] = useState(-1) // -1 = auto
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // HLS 초기화
  useEffect(() => {
    if (!signedUrl || !videoRef.current) return

    const video = videoRef.current
    setIsLoading(true)
    setError('')

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        startLevel: -1, // Auto quality
      })

      hls.loadSource(signedUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        // 품질 레벨 설정
        const levels = data.levels.map((level, index) => ({
          height: level.height,
          bitrate: level.bitrate,
          name: `${level.height}p`,
        }))
        setQualityLevels(levels)
        setIsLoading(false)

        // 이전 재생 위치로 이동
        if (initialProgress > 0) {
          video.currentTime = initialProgress
        }
      })

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentQuality(data.level)
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Network error, retrying...')
              hls.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Media error, recovering...')
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
      video.src = signedUrl
      setIsLoading(false)
      if (initialProgress > 0) {
        video.currentTime = initialProgress
      }
    }
  }, [signedUrl, initialProgress])

  // 진도 저장 인터벌
  useEffect(() => {
    if (isPlaying && onProgressUpdate) {
      progressIntervalRef.current = setInterval(() => {
        if (videoRef.current) {
          onProgressUpdate(videoRef.current.currentTime, false)
        }
      }, 10000)
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [isPlaying, onProgressUpdate])

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'arrowleft':
        case 'j':
          e.preventDefault()
          videoRef.current.currentTime -= 10
          break
        case 'arrowright':
        case 'l':
          e.preventDefault()
          videoRef.current.currentTime += 10
          break
        case 'arrowup':
          e.preventDefault()
          setVolume(prev => Math.min(1, prev + 0.1))
          break
        case 'arrowdown':
          e.preventDefault()
          setVolume(prev => Math.max(0, prev - 0.1))
          break
        case 'm':
          e.preventDefault()
          toggleMute()
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault()
          const percent = parseInt(e.key) * 10
          videoRef.current.currentTime = (duration * percent) / 100
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [duration])

  // 볼륨 변경 적용
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume
    }
  }, [volume])

  // 컨트롤 자동 숨김
  const resetHideControlsTimeout = useCallback(() => {
    setShowControls(true)
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current)
    }
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }, [isPlaying])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return
    const time = parseFloat(e.target.value)
    videoRef.current.currentTime = time
    setCurrentTime(time)
  }

  const handleQualityChange = (level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level
      setCurrentQuality(level)
    }
    setShowQualityMenu(false)
  }

  const handleSpeedChange = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed
      setPlaybackSpeed(speed)
    }
    setShowSpeedMenu(false)
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
      setDuration(videoRef.current.duration)

      // 버퍼링 상태
      const bufferedEnd = videoRef.current.buffered.length > 0
        ? videoRef.current.buffered.end(videoRef.current.buffered.length - 1)
        : 0
      setBuffered((bufferedEnd / videoRef.current.duration) * 100)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    if (onProgressUpdate) {
      onProgressUpdate(duration, true)
    }
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (error) {
    return (
      <div className="aspect-video bg-black flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black group"
      onMouseMove={resetHideControlsTimeout}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* 비디오 */}
      <video
        ref={videoRef}
        className="w-full h-full"
        playsInline
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsPlaying(false)
          if (videoRef.current && onProgressUpdate) {
            onProgressUpdate(videoRef.current.currentTime, false)
          }
        }}
        onLoadedData={() => setIsLoading(false)}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
      />

      {/* 로딩 인디케이터 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
        </div>
      )}

      {/* 큰 재생/일시정지 버튼 */}
      {!isPlaying && !isLoading && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
        >
          <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center">
            <svg className="w-10 h-10 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
      )}

      {/* 컨트롤바 */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* 프로그레스 바 */}
        <div className="relative mb-3 group/progress">
          <div className="h-1 bg-gray-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-500 absolute"
              style={{ width: `${buffered}%` }}
            />
            <div
              className="h-full bg-red-600 relative z-10"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between">
          {/* 왼쪽 컨트롤 */}
          <div className="flex items-center space-x-4">
            {/* 재생/일시정지 */}
            <button onClick={togglePlay} className="text-white hover:text-gray-300">
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* 10초 뒤로 */}
            <button
              onClick={() => videoRef.current && (videoRef.current.currentTime -= 10)}
              className="text-white hover:text-gray-300"
              title="10초 뒤로 (J)"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.5 3C17.15 3 21.08 6.03 22.47 10.22L20.1 11C19.05 7.81 16.04 5.5 12.5 5.5C10.54 5.5 8.77 6.22 7.38 7.38L10 10H3V3L5.62 5.62C7.45 3.95 9.87 3 12.5 3M10 12V22H8V14H6V12H10M18 14V20C18 21.11 17.11 22 16 22H14C12.9 22 12 21.1 12 20V14C12 12.9 12.9 12 14 12H16C17.11 12 18 12.9 18 14M14 14V20H16V14H14Z" />
              </svg>
            </button>

            {/* 10초 앞으로 */}
            <button
              onClick={() => videoRef.current && (videoRef.current.currentTime += 10)}
              className="text-white hover:text-gray-300"
              title="10초 앞으로 (L)"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.5 3C6.85 3 2.92 6.03 1.53 10.22L3.9 11C4.95 7.81 7.96 5.5 11.5 5.5C13.46 5.5 15.23 6.22 16.62 7.38L14 10H21V3L18.38 5.62C16.55 3.95 14.13 3 11.5 3M10 12V22H8V14H6V12H10M18 14V20C18 21.11 17.11 22 16 22H14C12.9 22 12 21.1 12 20V14C12 12.9 12.9 12 14 12H16C17.11 12 18 12.9 18 14M14 14V20H16V14H14Z" />
              </svg>
            </button>

            {/* 볼륨 */}
            <div className="flex items-center space-x-2">
              <button onClick={toggleMute} className="text-white hover:text-gray-300">
                {isMuted || volume === 0 ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                ) : volume < 0.5 ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 9v6h4l5 5V4L9 9H5zm11.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 accent-white"
              />
            </div>

            {/* 시간 표시 */}
            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* 오른쪽 컨트롤 */}
          <div className="flex items-center space-x-4">
            {/* 재생 속도 */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSpeedMenu(!showSpeedMenu)
                  setShowQualityMenu(false)
                }}
                className="text-white hover:text-gray-300 text-sm"
              >
                {playbackSpeed}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-800 rounded shadow-lg py-1 min-w-[80px]">
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={`block w-full text-left px-4 py-1 text-sm ${
                        playbackSpeed === speed ? 'text-blue-400' : 'text-white'
                      } hover:bg-gray-700`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 화질 선택 */}
            {qualityLevels.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowQualityMenu(!showQualityMenu)
                    setShowSpeedMenu(false)
                  }}
                  className="text-white hover:text-gray-300 text-sm"
                >
                  {currentQuality === -1 ? '자동' : qualityLevels[currentQuality]?.name || '자동'}
                </button>
                {showQualityMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-gray-800 rounded shadow-lg py-1 min-w-[80px]">
                    <button
                      onClick={() => handleQualityChange(-1)}
                      className={`block w-full text-left px-4 py-1 text-sm ${
                        currentQuality === -1 ? 'text-blue-400' : 'text-white'
                      } hover:bg-gray-700`}
                    >
                      자동
                    </button>
                    {qualityLevels.map((level, index) => (
                      <button
                        key={index}
                        onClick={() => handleQualityChange(index)}
                        className={`block w-full text-left px-4 py-1 text-sm ${
                          currentQuality === index ? 'text-blue-400' : 'text-white'
                        } hover:bg-gray-700`}
                      >
                        {level.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 전체화면 */}
            <button onClick={toggleFullscreen} className="text-white hover:text-gray-300">
              {isFullscreen ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 타이틀 오버레이 (전체화면시) */}
      {isFullscreen && showControls && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 to-transparent p-4">
          <h2 className="text-white text-lg font-medium">{title}</h2>
        </div>
      )}
    </div>
  )
}
