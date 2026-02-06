'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Course {
  id: string
  title: string
  description: string
  thumbnail_url: string | null
  instructor_name: string | null
  is_published: boolean
  created_at: string
}

interface Video {
  id: string
  title: string
  order_index: number
}

export default function AdminCoursesPage() {
  const searchParams = useSearchParams()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [courseVideos, setCourseVideos] = useState<{ [key: string]: Video[] }>({})
  const supabase = createClient()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thumbnail_url: '',
    instructor_name: '',
    is_published: false,
  })

  useEffect(() => {
    fetchCourses()
    if (searchParams.get('action') === 'new') {
      setShowModal(true)
    }
  }, [searchParams])

  const fetchCourses = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      const coursesData = data as Course[]
      setCourses(coursesData)
      // 각 강의의 비디오 수 조회
      for (const course of coursesData) {
        const { data: videos } = await supabase
          .from('videos')
          .select('id, title, order_index')
          .eq('course_id', course.id)
          .order('order_index')
        if (videos) {
          setCourseVideos(prev => ({ ...prev, [course.id]: videos as Video[] }))
        }
      }
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // DB 스키마에 존재하는 필드만 전송
    const payload: Record<string, unknown> = {
      title: formData.title,
      description: formData.description || null,
      thumbnail_url: formData.thumbnail_url || null,
      is_published: formData.is_published,
    }

    if (editingCourse) {
      const { error } = await supabase
        .from('courses')
        .update(payload)
        .eq('id', editingCourse.id)

      if (error) {
        alert(`수정 실패: ${error.message}`)
      } else {
        fetchCourses()
        closeModal()
      }
    } else {
      const { error } = await supabase.from('courses').insert(payload)

      if (error) {
        alert(`생성 실패: ${error.message}`)
      } else {
        fetchCourses()
        closeModal()
      }
    }
  }

  const handleDelete = async (courseId: string) => {
    if (!confirm('정말 삭제하시겠습니까? 관련된 모든 비디오와 수강 등록도 삭제됩니다.')) {
      return
    }

    // 관련 데이터 삭제
    await supabase.from('watch_history').delete().in(
      'video_id',
      (courseVideos[courseId] || []).map(v => v.id)
    )
    await supabase.from('videos').delete().eq('course_id', courseId)
    await supabase.from('enrollments').delete().eq('course_id', courseId)
    await supabase.from('courses').delete().eq('id', courseId)

    fetchCourses()
  }

  const openEditModal = (course: Course) => {
    setEditingCourse(course)
    setFormData({
      title: course.title,
      description: course.description || '',
      thumbnail_url: course.thumbnail_url || '',
      instructor_name: course.instructor_name || '',
      is_published: course.is_published,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingCourse(null)
    setFormData({
      title: '',
      description: '',
      thumbnail_url: '',
      instructor_name: '',
      is_published: false,
    })
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">강의 관리</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + 새 강의
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                강의
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                비디오
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {courses.map((course) => (
              <tr key={course.id}>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    {course.thumbnail_url && (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-16 h-10 object-cover rounded mr-4"
                      />
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">{course.title}</div>
                      <div className="text-sm text-gray-500">{course.instructor_name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {courseVideos[course.id]?.length || 0}개
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      course.is_published
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {course.is_published ? '공개' : '비공개'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm">
                  <button
                    onClick={() => openEditModal(course)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(course.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {courses.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            등록된 강의가 없습니다.
          </div>
        )}
      </div>

      {/* 강의 생성/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingCourse ? '강의 수정' : '새 강의 만들기'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    강의명 *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    설명
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    썸네일 URL
                  </label>
                  <input
                    type="url"
                    value={formData.thumbnail_url}
                    onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    강사명
                  </label>
                  <input
                    type="text"
                    value={formData.instructor_name}
                    onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_published"
                    checked={formData.is_published}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="is_published" className="text-sm text-gray-700">
                    공개 여부
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingCourse ? '저장' : '생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
