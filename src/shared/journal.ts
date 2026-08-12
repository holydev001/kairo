import { z } from 'zod'

export const prioritySchema = z.object({
  id: z.string().min(1),
  text: z.string().max(140),
  completed: z.boolean()
})

export const commitmentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(80),
  detail: z.string().max(160),
  target: z.string().max(80),
  icon: z.string().min(1).max(40),
  completed: z.boolean()
})

export const commitmentCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(50),
  commitments: z.array(commitmentSchema).max(24)
})

export const readingLogSchema = z.object({
  book: z.string().max(160),
  pages: z.number().int().min(0).max(10000),
  minutes: z.number().int().min(0).max(1440),
  takeaway: z.string().max(1200)
})

export type ReadingLog = z.infer<typeof readingLogSchema>

export type CommitmentCategory = z.infer<typeof commitmentCategorySchema>
export type Commitment = z.infer<typeof commitmentSchema>
export const commitmentTemplatesSchema = z.array(commitmentCategorySchema).max(16)

export function createDefaultCommitmentCategories(): CommitmentCategory[] {
  return [
    {
      id: 'health',
      name: 'Health',
      commitments: [
        {
          id: 'workout',
          title: 'Workout',
          detail: '',
          target: '',
          icon: 'dumbbell',
          completed: false
        }
      ]
    },
    {
      id: 'learning',
      name: 'Learning',
      commitments: [
        {
          id: 'reading',
          title: 'Reading',
          detail: '',
          target: '',
          icon: 'book-open',
          completed: false
        }
      ]
    },
    {
      id: 'faith',
      name: 'Faith',
      commitments: [
        {
          id: 'scripture',
          title: 'Scripture',
          detail: '',
          target: '',
          icon: 'cross',
          completed: false
        }
      ]
    }
  ]
}

const dailyEntryBaseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  intention: z.string().max(240),
  priorities: z.array(prioritySchema).max(3),
  commitmentCategories: z
    .array(commitmentCategorySchema)
    .max(16)
    .default(createDefaultCommitmentCategories),
  mood: z.number().int().min(1).max(10),
  energy: z.number().int().min(1).max(10),
  reflection: z.string().max(2000),
  gratitude: z.string().max(1000),
  notes: z.string().max(2000).default(''),
  reading: readingLogSchema.default({ book: '', pages: 0, minutes: 0, takeaway: '' }),
  updatedAt: z.string()
})

type LegacyCommitments = {
  workout?: { completed?: boolean; plan?: string }
  reading?: { completed?: boolean; book?: string; target?: string }
  faith?: { completed?: boolean; reference?: string }
}

function migrateLegacyEntry(value: unknown): unknown {
  if (!value || typeof value !== 'object' || 'commitmentCategories' in value) return value

  const entry = value as Record<string, unknown>
  const legacy = entry.commitments as LegacyCommitments | undefined
  if (!legacy) return value

  const categories = createDefaultCommitmentCategories()
  const workout = categories[0]?.commitments[0]
  const reading = categories[1]?.commitments[0]
  const scripture = categories[2]?.commitments[0]

  if (workout && legacy.workout) {
    workout.completed = Boolean(legacy.workout.completed)
    workout.detail = legacy.workout.plan ?? ''
  }
  if (reading && legacy.reading) {
    reading.completed = Boolean(legacy.reading.completed)
    reading.detail = legacy.reading.book ?? ''
    reading.target = legacy.reading.target ?? ''
  }
  if (scripture && legacy.faith) {
    scripture.completed = Boolean(legacy.faith.completed)
    scripture.detail = legacy.faith.reference ?? ''
  }

  return { ...entry, commitmentCategories: categories }
}

export const dailyEntrySchema = z.preprocess(migrateLegacyEntry, dailyEntryBaseSchema)
export type DailyEntry = z.infer<typeof dailyEntryBaseSchema>

export function createEmptyEntry(
  date: string,
  commitmentCategories = createDefaultCommitmentCategories()
): DailyEntry {
  return {
    date,
    intention: '',
    priorities: Array.from({ length: 3 }, (_, index) => ({
      id: `priority-${index + 1}`,
      text: '',
      completed: false
    })),
    commitmentCategories: structuredClone(commitmentCategories),
    mood: 5,
    energy: 5,
    reflection: '',
    gratitude: '',
    notes: '',
    reading: { book: '', pages: 0, minutes: 0, takeaway: '' },
    updatedAt: new Date().toISOString()
  }
}
