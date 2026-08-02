import { z } from 'zod'

export const prioritySchema = z.object({
  id: z.string().min(1),
  text: z.string().max(140),
  completed: z.boolean()
})

export const dailyCommitmentsSchema = z.object({
  workout: z
    .object({ scheduled: z.boolean(), completed: z.boolean(), plan: z.string().max(160) })
    .default({ scheduled: false, completed: false, plan: '' }),
  reading: z
    .object({
      completed: z.boolean(),
      book: z.string().max(160),
      target: z.string().max(80)
    })
    .default({ completed: false, book: '', target: '' }),
  faith: z
    .object({
      completed: z.boolean(),
      reference: z.string().max(120),
      reflection: z.string().max(500)
    })
    .default({ completed: false, reference: '', reflection: '' })
})

export const dailyEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  intention: z.string().max(240),
  priorities: z.array(prioritySchema).max(3),
  commitments: dailyCommitmentsSchema.default({
    workout: { scheduled: false, completed: false, plan: '' },
    reading: { completed: false, book: '', target: '' },
    faith: { completed: false, reference: '', reflection: '' }
  }),
  mood: z.number().int().min(1).max(10),
  energy: z.number().int().min(1).max(10),
  reflection: z.string().max(2000),
  gratitude: z.string().max(1000),
  updatedAt: z.string()
})

export type DailyEntry = z.infer<typeof dailyEntrySchema>

export function createEmptyEntry(date: string): DailyEntry {
  return {
    date,
    intention: '',
    priorities: Array.from({ length: 3 }, (_, index) => ({
      id: `priority-${index + 1}`,
      text: '',
      completed: false
    })),
    commitments: {
      workout: { scheduled: false, completed: false, plan: '' },
      reading: { completed: false, book: '', target: '' },
      faith: { completed: false, reference: '', reflection: '' }
    },
    mood: 5,
    energy: 5,
    reflection: '',
    gratitude: '',
    updatedAt: new Date().toISOString()
  }
}
