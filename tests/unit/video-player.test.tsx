import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import VideoPlayer from '@/components/VideoPlayer'

describe('VideoPlayer', () => {
  const defaultProps = {
    embedUrl: 'https://iframe.mediadelivery.net/embed/123/abc',
    title: 'Test Video',
  }

  it('renders iframe with correct src', () => {
    render(<VideoPlayer {...defaultProps} />)
    
    const iframe = screen.getByTitle('Test Video')
    expect(iframe).toBeInTheDocument()
    expect(iframe).toHaveAttribute('src', defaultProps.embedUrl)
  })

  it('shows loading state initially', () => {
    render(<VideoPlayer {...defaultProps} />)
    
    // Loading spinner should be visible
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('applies correct CSS classes for aspect ratio', () => {
    const { container } = render(<VideoPlayer {...defaultProps} />)
    
    const wrapper = container.firstChild
    expect(wrapper).toHaveClass('aspect-video')
  })

  it('passes initialProgress prop correctly', () => {
    render(<VideoPlayer {...defaultProps} initialProgress={120} />)
    
    const iframe = screen.getByTitle('Test Video')
    expect(iframe).toBeInTheDocument()
  })

  it('calls onProgressUpdate when provided', () => {
    const onProgressUpdate = vi.fn()
    render(
      <VideoPlayer
        {...defaultProps}
        onProgressUpdate={onProgressUpdate}
      />
    )
    
    const iframe = screen.getByTitle('Test Video')
    expect(iframe).toBeInTheDocument()
  })
})
