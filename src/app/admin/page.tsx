'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Stats {
  totalCourses: number
  totalVideos: number
  totalUsers: number
  totalEnrollments: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalCourses: 0,
    totalVideos: 0,
    totalUsers: 0,
    totalEnrollments: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [courses, videos, users, enrollments] = await Promise.all([
          supabase.from('courses').select('*', { count: 'exact', head: true }),
          supabase.from('videos').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('enrollments').select('*', { count: 'exact', head: true }),
        ])

        setStats({
          totalCourses: courses.count || 0,
          totalVideos: videos.count || 0,
          totalUsers: users.count || 0,
          totalEnrollments: enrollments.count || 0,
        })
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const statCards = [
    { label: '전체 강의', value: stats.totalCourses, href: '/admin/courses', color: 'bg-blue-500' },
    { label: '전체 비디오', value: stats.totalVideos, href: '/admin/videos', color: 'bg-green-500' },
    { label: '전체 사용자', value: stats.totalUsers, href: '/admin/users', color: 'bg-purple-500' },
    { label: '수강 등록', value: stats.totalEnrollments, href: '/admin/courses', color: 'bg-orange-500' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">대시보드</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className={`inline-block px-3 py-1 rounded-full text-white text-sm ${card.color} mb-4`}>
              {card.label}
            </div>
            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">빠른 작업</h2>
          <div className="space-y-3">
            <Link
              href="/admin/courses?action=new"
              className="block w-full text-left px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
            >
              + 새 강의 만들기
            </Link>
            <Link
              href="/admin/videos?action=upload"
              className="block w-full text-left px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
            >
              + 비디오 업로드
            </Link>
            <Link
              href="/admin/users"
              className="block w-full text-left px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100"
            >
              사용자 수강 등록
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">시스템 정보</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>백엔드: FastAPI + Supabase</p>
            <p>비디오 스트리밍: Bunny Stream</p>
            <p>프론트엔드: Next.js 15</p>
          </div>
        </div>
      </div>
    </div>
  )
}
