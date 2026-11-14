'use server'

import { fetchLikedCaptionsAction } from '@/app/actions/captions/fetch-liked-captions-action'
import { classifyHumor, type HumorStyle } from '@/lib/classify-humor'

export type HumorPreference = {
  style: HumorStyle
  count: number
  percentage: number
}

export async function fetchHumorPreferencesAction(): Promise<HumorPreference[]> {
  // Get the user's currently liked captions.
  const captions = await fetchLikedCaptionsAction()

  if (captions.length === 0) {
    return []
  }

  // Count how many liked captions belong to each style.
  const counts = new Map<HumorStyle, number>()

  for (const caption of captions) {
    const style = classifyHumor(caption.content ?? '')

    counts.set(style, (counts.get(style) ?? 0) + 1)
  }

  // Convert counts into a ranked list with percentages.
  const preferences: HumorPreference[] = Array.from(counts.entries())
    .map(([style, count]) => ({
      style,
      count,
      percentage: Math.round((count / captions.length) * 100),
    }))
    .sort((a, b) => b.count - a.count)

  return preferences
}
