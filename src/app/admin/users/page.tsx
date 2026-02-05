'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface User {
  id: string
  email: string
  name: string
  role: string
  created_at: string
}

interface Course {
  id: string
  title: string
}

interface Enrollment {
  id: string
  user_id: string
  course_id: string
  enrolled_at: string
  expires_at: string | null
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [usersRes, coursesRes, enrollmentsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('courses').select('id, title').order('title'),
      supabase.from('enrollments').select('*'),
    ])

    if (usersRes.data) setUsers(usersRes.data)
    if (coursesRes.data) setCourses(coursesRes.data)
    if (enrollmentsRes.data) setEnrollments(enrollmentsRes.data)
    setLoading(false)
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
  }

  const handleEnroll = async () => {
    if (!selectedUser || !selectedCourse) return

    // 이미 등록되어 있는지 확인
    const existing = enrollments.find(
      e => e.user_id === selectedUser.id && e.course_id === selectedCourse
    )

    if (existing) {
      alert('이미 등록된 강의입니다.')
      return
    }

    const { error } = await supabase.from('enrollments').insert({
      user_id: selectedUser.id,
      course_id: selectedCourse,
    })

    if (!error) {
      fetchData()
      setShowEnrollModal(false)
      setSelectedUser(null)
      setSelectedCourse('')
    }
  }

  const handleUnenroll = async (enrollmentId: string) => {
    if (!confirm('수강 등록을 취소하시겠습니까?')) return

    await supabase.from('enrollments').delete().eq('id', enrollmentId)
    fetchData()
  }

  const getUserEnrollments = (userId: string) => {
    return enrollments.filter(e => e.user_id === userId)
  }

  const getCourseName = (courseId: string) => {
    return courses.find(c => c.id === courseId)?.title || '-'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">사용자 관리</h1>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                사용자
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                역할
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                수강 강의
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                가입일
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => {
              const userEnrollments = getUserEnrollments(user.id)
              return (
                <tr key={user.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded border ${
                        user.role === 'admin'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : 'bg-gray-50 text-gray-800 border-gray-200'
                      }`}
                    >
                      <option value="student">학생</option>
                      <option value="admin">관리자</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {userEnrollments.length === 0 ? (
                        <span className="text-sm text-gray-400">없음</span>
                      ) : (
                        userEnrollments.map((enrollment) => (
                          <div
                            key={enrollment.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-gray-700">
                              {getCourseName(enrollment.course_id)}
                            </span>
                            <button
                              onClick={() => handleUnenroll(enrollment.id)}
                              className="text-red-500 hover:text-red-700 ml-2"
                              title="수강 취소"
                            >
                              ×
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedUser(user)
                        setShowEnrollModal(true)
                      }}
                      className="text-blue-600 hover:text-blue-900 text-sm"
                    >
                      강의 등록
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            등록된 사용자가 없습니다.
          </div>
        )}
      </div>

      {/* 수강 등록 모달 */}
      {showEnrollModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">강의 등록</h2>
            <p className="text-gray-600 mb-4">
              <strong>{selectedUser.name}</strong>님을 강의에 등록합니다.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                강의 선택
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">강의를 선택하세요</option>
                {courses
                  .filter(c => !getUserEnrollments(selectedUser.id).some(e => e.course_id === c.id))
                  .map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEnrollModal(false)
                  setSelectedUser(null)
                  setSelectedCourse('')
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                취소
              </button>
              <button
                onClick={handleEnroll}
                disabled={!selectedCourse}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
