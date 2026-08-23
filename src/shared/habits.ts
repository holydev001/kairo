import { z } from 'zod'

export const habitSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(80),
  identity: z.string().max(120),
  cue: z.string().max(160),
  tinyVersion: z.string().max(160),
  reward: z.string().max(160),
  icon: z.string().min(1).max(40),
  createdAt: z.string()
})

export const habitStoreSchema = z.object({
  habits: z.array(habitSchema).max(50),
  completions: z.record(z.string(), z.record(z.string(), z.boolean()))
})

export type Habit = z.infer<typeof habitSchema>
export type HabitStore = z.infer<typeof habitStoreSchema>

export function createDefaultHabitStore(): HabitStore {
  return { habits: [], completions: {} }
}
