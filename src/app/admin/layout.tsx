'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // 프로필에서 role 확인
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const profileData = profile as { role: string } | null
      if (!profileData || profileData.role !== 'admin') {
        router.push('/courses')
        return
      }

      setIsAdmin(true)
      setLoading(false)
    }

    checkAdmin()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link
                href="/admin"
                className="flex items-center px-2 text-xl font-bold text-gray-900"
              >
                관리자 대시보드
              </Link>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
                <Link
                  href="/admin/courses"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  강의 관리
                </Link>
                <Link
                  href="/admin/videos"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  비디오 업로드
                </Link>
                <Link
                  href="/admin/users"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  사용자 관리
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/courses"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                학생 화면
              </Link>
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push('/login')
                }}
                className="text-sm text-red-600 hover:text-red-800"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
