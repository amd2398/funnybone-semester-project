'use server'

import { createClient } from '@/utils/supabase/server'
import { fetchHumorPreferencesAction } from '@/app/actions/captions/fetch-humor-preferences-action'
import { classifyHumor, type HumorStyle } from '@/lib/classify-humor'

export async function fetchRecommendedCaptionsAction(limit = 50) {
  const supabase = await createClient()

  // 1. Identify the current user.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  // 2. Retrieve the user's humor preferences.
  const preferences = await fetchHumorPreferencesAction()

  const preferenceScores = new Map<HumorStyle, number>(
    preferences.map((preference) => [preference.style, preference.count])
  )

  // 3. Retrieve captions the user has already voted on.
  const votedCaptionIds = new Set<string>()
  const pageSize = 500

  for (let offset = 0; ; offset += pageSize) {
    const { data: votes, error: votesError } = await supabase
      .from('caption_votes')
      .select('id, caption_id')
      .eq('profile_id', user.id)
      .in('vote_value', [1, -1])
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (votesError) {
      console.error('Error fetching voting history:', votesError)
      throw new Error('Failed to fetch voting history')
    }

    for (const vote of votes ?? []) {
      if (vote.caption_id) {
        votedCaptionIds.add(vote.caption_id)
      }
    }

    if (!votes || votes.length < pageSize) {
      break
    }
  }

  // 4. Retrieve public caption candidates.
  const { data: captions, error: captionsError } = await supabase
    .from('captions')
    .select(
      `
      id,
      content,
      image_id,
      like_count,
      created_datetime_utc,
      images!inner (
        id,
        url,
        is_common_use,
        is_public
      )
    `
    )
    .eq('is_public', true)
    .eq('images.is_public', true)
    .order('like_count', { ascending: false, nullsFirst: false })
    .order('created_datetime_utc', { ascending: false })
    .limit(500)

  if (captionsError) {
    console.error('Error fetching captions:', captionsError)
    throw new Error('Failed to fetch recommended captions')
  }

  // 5. Normalize the Supabase image relationship,
  // exclude previously voted captions, and calculate scores.
  const recommendations = (captions ?? [])
    .map((caption) => ({
      ...caption,
      image: Array.isArray(caption.images) ? caption.images[0] : caption.images,
    }))
    .filter(
      (caption) =>
        !votedCaptionIds.has(caption.id) &&
        Boolean(caption.content?.trim()) &&
        Boolean(caption.image?.url)
    )
    .map((caption) => {
      const humorStyle = classifyHumor(caption.content ?? '')

      const preferenceScore = preferenceScores.get(humorStyle) ?? 0

      return {
        id: caption.id,
        content: caption.content ?? '',
        image_id: caption.image_id ?? '',
        image_url: caption.image?.url ?? '',
        like_count: caption.like_count ?? 0,
        is_common_use: caption.image?.is_common_use ?? false,
        created_at: caption.created_datetime_utc,
        humor_style: humorStyle,
        recommendation_score: preferenceScore,
      }
    })

  // 6. Prioritize preferred humor styles.
  recommendations.sort((a, b) => {
    if (b.recommendation_score !== a.recommendation_score) {
      return b.recommendation_score - a.recommendation_score
    }

    if (b.like_count !== a.like_count) {
      return b.like_count - a.like_count
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return recommendations.slice(0, limit)
}
