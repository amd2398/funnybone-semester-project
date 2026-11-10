'use server'

import { createClient } from '@/utils/supabase/server'

export const fetchLikedCaptionsAction = async () => {
  const supabase = await createClient()

  // Get the currently logged-in user.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  // Retrieve the user's votes, newest first.
  const { data: votes, error: votesError } = await supabase
    .from('caption_votes')
    .select('caption_id, vote_value, created_datetime_utc')
    .eq('profile_id', user.id)
    .order('created_datetime_utc', { ascending: false })

  if (votesError) {
    console.error('Error fetching likes:', votesError)
    throw new Error('Failed to fetch liked captions.')
  }

  // Keep only the latest vote for each caption.
  // A later downvote cancels an earlier upvote.
  const latestVotes = new Map<string, number>()

  for (const vote of votes ?? []) {
    if (vote.caption_id && !latestVotes.has(vote.caption_id)) {
      latestVotes.set(vote.caption_id, Number(vote.vote_value))
    }
  }

  const likedIds = Array.from(latestVotes.entries())
    .filter(([, value]) => value === 1)
    .map(([id]) => id)

  if (likedIds.length === 0) return []

  // Fetch the captions and their associated images.
  const captions: any[] = []

  for (let i = 0; i < likedIds.length; i += 200) {
    const batch = likedIds.slice(i, i + 200)

    const { data, error } = await supabase
      .from('captions')
      .select('id, content, image_id, images(id, url)')
      .in('id', batch)

    if (error) {
      console.error('Error fetching liked captions:', error)
      throw new Error('Failed to load liked captions.')
    }

    captions.push(...(data ?? []))
  }

  // Match the data structure used by the Favorites page.
  const captionsById = new Map(captions.map((caption) => [caption.id, caption]))

  return likedIds
    .map((id) => captionsById.get(id))
    .filter((caption) => caption !== undefined)
    .map((caption) => {
      const image = Array.isArray(caption.images) ? caption.images[0] : caption.images

      return {
        id: caption.id,
        content: caption.content,
        image_id: caption.image_id,
        image_url: image?.url || '/placeholder.svg',
      }
    })
}
