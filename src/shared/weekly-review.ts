import { z } from 'zod'

export const weeklyReviewSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  wins: z.string().max(2000),
  challenges: z.string().max(2000),
  lessons: z.string().max(2000),
  nextFocus: z.string().max(2000),
  updatedAt: z.string()
})

export type WeeklyReview = z.infer<typeof weeklyReviewSchema>

export function createEmptyWeeklyReview(weekStart: string): WeeklyReview {
  return {
    weekStart,
    wins: '',
    challenges: '',
    lessons: '',
    nextFocus: '',
    updatedAt: new Date().toISOString()
  }
}
