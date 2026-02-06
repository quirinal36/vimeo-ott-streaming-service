import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login')
    
    await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible()
    await expect(page.getByPlaceholder('이메일')).toBeVisible()
    await expect(page.getByPlaceholder('비밀번호')).toBeVisible()
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible()
  })

  test('should show signup page', async ({ page }) => {
    await page.goto('/signup')
    
    await expect(page.getByRole('heading', { name: '회원가입' })).toBeVisible()
    await expect(page.getByPlaceholder('이메일')).toBeVisible()
    await expect(page.getByPlaceholder('비밀번호')).toBeVisible()
  })

  test('should navigate from login to signup', async ({ page }) => {
    await page.goto('/login')
    
    await page.getByRole('link', { name: '회원가입' }).click()
    
    await expect(page).toHaveURL('/signup')
  })

  test('should show error for invalid login', async ({ page }) => {
    await page.goto('/login')
    
    await page.getByPlaceholder('이메일').fill('invalid@example.com')
    await page.getByPlaceholder('비밀번호').fill('wrongpassword')
    await page.getByRole('button', { name: '로그인' }).click()
    
    // Wait for error message
    await expect(page.getByText(/Invalid|오류|실패/)).toBeVisible({ timeout: 10000 })
  })

  test('should redirect unauthenticated user from courses to login', async ({ page }) => {
    await page.goto('/courses')
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })
})
