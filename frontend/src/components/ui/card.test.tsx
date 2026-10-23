import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card, CardContent } from './card'

// jsdom does not apply the CSS, so a class Tailwind does not recognise (two classes fused by a missing space) is
// invisible to every behaviour test: the card lost its padding and its border turned black (ui-polish design D3,
// review 12.2). These are the classes that give the card its look, each one on its own.
describe('Card', () => {
  it('keeps its padding, the soft border of the theme and the shadow of the theme', () => {
    render(
      <Card data-testid="card">
        <CardContent>Body</CardContent>
      </Card>,
    )

    const card = screen.getByTestId('card')
    expect(card).toHaveClass('py-(--card-spacing)', '[--card-spacing:--spacing(4)]')
    expect(card).toHaveClass('ring-1', 'ring-foreground/10')
    expect(card).toHaveClass('shadow-card')
    expect(screen.getByText('Body')).toHaveClass('px-(--card-spacing)')
  })

  it('keeps the padding when a screen adds its own classes', () => {
    render(<Card data-testid="card" className="w-fit gap-2" />)

    expect(screen.getByTestId('card')).toHaveClass('py-(--card-spacing)', '[--card-spacing:--spacing(4)]', 'w-fit')
  })
})
