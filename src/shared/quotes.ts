export const kaizenThoughts = [
  'Small steps, repeated with intention, become transformation.',
  'Improve the system, and the result will follow.',
  'Do not chase perfection. Refine what you practiced yesterday.',
  'A quiet commitment kept daily is stronger than sudden motivation.',
  'Notice honestly. Adjust deliberately. Continue patiently.',
  'The direction matters more than the speed.',
  'Become better by making the next action better.'
] as const

export function dailyQuoteForDate(date: string): string {
  const dayNumber = Math.floor(new Date(`${date}T00:00:00`).getTime() / 86_400_000)
  return kaizenThoughts[dayNumber % kaizenThoughts.length] ?? kaizenThoughts[0]
}
