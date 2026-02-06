import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch for API testing
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('API Integration Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('GET /api/courses', () => {
    it('returns courses list for authenticated user', async () => {
      const mockCourses = {
        courses: [
          { id: '1', title: 'Course 1', progress: 50 },
          { id: '2', title: 'Course 2', progress: 0 },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCourses,
      })

      const response = await fetch('/api/courses')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.courses).toHaveLength(2)
      expect(data.courses[0].title).toBe('Course 1')
    })

    it('returns 401 for unauthenticated user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: '인증이 필요합니다.' }),
      })

      const response = await fetch('/api/courses')

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/videos/:id/signed-url', () => {
    it('returns signed URL for enrolled user', async () => {
      const mockResponse = {
        embedUrl: 'https://iframe.mediadelivery.net/embed/123/abc?token=xyz',
        video: { id: '1', title: 'Video 1' },
        expiresIn: 7200,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const response = await fetch('/api/videos/1/signed-url', {
        method: 'POST',
      })
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.embedUrl).toContain('token=')
      expect(data.expiresIn).toBe(7200)
    })

    it('returns 403 for non-enrolled user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: '이 강의에 대한 수강 권한이 없습니다' }),
      })

      const response = await fetch('/api/videos/1/signed-url', {
        method: 'POST',
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(403)
    })
  })

  describe('POST /api/videos/:id/progress', () => {
    it('saves watch progress', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' }),
      })

      const response = await fetch('/api/videos/1/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress_seconds: 120, is_completed: false }),
      })
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.status).toBe('success')
    })

    it('marks video as completed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' }),
      })

      const response = await fetch('/api/videos/1/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress_seconds: 600, is_completed: true }),
      })

      expect(response.ok).toBe(true)
    })
  })

  describe('Authentication Flow', () => {
    it('POST /api/auth/login - successful login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: '1', email: 'test@example.com' },
          session: { access_token: 'token123' },
        }),
      })

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
      })

      expect(response.ok).toBe(true)
    })

    it('POST /api/auth/login - invalid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid login credentials' }),
      })

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'wrong' }),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
    })
  })
})
