import { test, expect } from '@playwright/test'

test.describe('Courses', () => {
  // These tests require authentication - skip in CI without test accounts
  test.describe('Authenticated User', () => {
    test.skip(({ browserName }) => !process.env.TEST_USER_EMAIL, 'Requires test account')

    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto('/login')
      await page.getByPlaceholder('이메일').fill(process.env.TEST_USER_EMAIL!)
      await page.getByPlaceholder('비밀번호').fill(process.env.TEST_USER_PASSWORD!)
      await page.getByRole('button', { name: '로그인' }).click()
      
      // Wait for redirect to courses
      await expect(page).toHaveURL('/courses', { timeout: 10000 })
    })

    test('should display courses list', async ({ page }) => {
      await expect(page.getByRole('heading', { name: '내 강의실' })).toBeVisible()
    })

    test('should navigate to video library', async ({ page }) => {
      await page.getByRole('link', { name: '비디오 라이브러리' }).click()
      
      await expect(page).toHaveURL('/videos')
      await expect(page.getByRole('heading', { name: '내 비디오 라이브러리' })).toBeVisible()
    })

    test('should filter videos by status', async ({ page }) => {
      await page.goto('/videos')
      
      // Click filter buttons
      await page.getByRole('button', { name: /시청 중/ }).click()
      await page.getByRole('button', { name: /완료/ }).click()
      await page.getByRole('button', { name: /전체/ }).click()
    })
  })
})

test.describe('Landing Page', () => {
  test('should show landing page for unauthenticated user', async ({ page }) => {
    await page.goto('/')
    
    await expect(page.getByRole('heading', { name: /최고의 강의/ })).toBeVisible()
    await expect(page.getByRole('link', { name: '시작하기' })).toBeVisible()
    await expect(page.getByRole('link', { name: '로그인' })).toBeVisible()
  })

  test('should navigate to signup from landing', async ({ page }) => {
    await page.goto('/')
    
    await page.getByRole('link', { name: '시작하기' }).click()
    
    await expect(page).toHaveURL('/signup')
  })
})
