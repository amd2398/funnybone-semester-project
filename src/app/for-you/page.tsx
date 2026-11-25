'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react'
import { BrandImage } from '@/components/brand-image'
import { CaptionGridSkeleton } from '@/components/ui/image-grid-skeleton'
import { checkAuthStatusAction } from '@/app/actions/auth/check-auth-status'
import { fetchRecommendedCaptionsAction } from '@/app/actions/captions/fetch-recommended-captions-action'
import { toggleCaptionVoteAction } from '@/app/actions/captions/toggle-caption-vote-action'
import {
  fetchHumorPreferencesAction,
  type HumorPreference,
} from '@/app/actions/captions/fetch-humor-preferences-action'
import { useToast } from '@/hooks/use-toast'

type RecommendedCaption = Awaited<ReturnType<typeof fetchRecommendedCaptionsAction>>[number]

export default function ForYouPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [captions, setCaptions] = useState<RecommendedCaption[]>([])
  const [preferences, setPreferences] = useState<HumorPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [visibleCount, setVisibleCount] = useState(8)
  const [refreshKey, setRefreshKey] = useState(0)
  const [votingIds, setVotingIds] = useState<string[]>([])
  const pendingVotes = useRef(new Set<string>())

  // Load personalized recommendations.
  useEffect(() => {
    let active = true

    async function loadRecommendations() {
      setLoading(true)
      setError('')

      try {
        const auth = await checkAuthStatusAction()

        if (!auth.isAuthenticated || auth.isAnonymous) {
          router.push('/login')
          return
        }

        const [recommended, humorPreferences] = await Promise.all([
          fetchRecommendedCaptionsAction(50),
          fetchHumorPreferencesAction(),
        ])

        if (active) {
          setCaptions(recommended)
          setPreferences(humorPreferences)
          setVisibleCount(8)
        }
      } catch (err) {
        console.error('Failed to load recommendations:', err)

        if (active) {
          setError('Could not load your personalized feed.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadRecommendations()

    return () => {
      active = false
    }
  }, [router, refreshKey])

  // Save a vote and remove the caption from recommendations.
  async function handleVote(captionId: string, voteValue: 1 | -1) {
    if (pendingVotes.current.has(captionId)) return

    pendingVotes.current.add(captionId)
    setVotingIds((previous) => [...previous, captionId])

    try {
      await toggleCaptionVoteAction(captionId, voteValue)

      setCaptions((previous) => previous.filter((caption) => caption.id !== captionId))

      toast({
        title: voteValue === 1 ? 'Caption liked!' : 'Vote recorded',
        description: 'Your feedback helps personalize your feed.',
      })

      try {
        const updatedPreferences = await fetchHumorPreferencesAction()

        setPreferences(updatedPreferences)
      } catch (err) {
        console.error('Could not refresh preferences:', err)
      }
    } catch (err) {
      console.error('Failed to vote:', err)

      toast({
        title: 'Error',
        description: 'Could not save your vote. Please try again.',
      })
    } finally {
      pendingVotes.current.delete(captionId)
      setVotingIds((previous) => previous.filter((id) => id !== captionId))
    }
  }

  const visibleCaptions = captions.slice(0, visibleCount)

  return (
    <div className="flex-1 w-full flex flex-col gap-8 p-4">
      {/* Page header */}
      <div className="w-full max-w-7xl mx-auto px-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-base sm:text-2xl font-normal flex items-center gap-2 text-primary">
            <Sparkles className="w-6 h-6" />
            For You
          </h1>

          <button
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={loading || votingIds.length > 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/20 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          Discover captions recommended for your sense of humor.
        </p>
      </div>

      {/* Personalization summary */}
      {!loading && !error && (
        <div className="w-full max-w-7xl mx-auto px-4">
          <div className="rounded-lg border border-primary/20 bg-background/30 p-5 space-y-3">
            <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Personalized for you
            </h2>

            {preferences.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Your recommendations prioritize humor styles you enjoy. Refresh your feed to
                  update the ranking.
                </p>

                <div className="flex flex-wrap gap-2">
                  {preferences.slice(0, 3).map((preference) => (
                    <span
                      key={preference.style}
                      className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm capitalize"
                    >
                      {preference.style} ({preference.percentage}%)
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Start upvoting captions to personalize your feed. For now, we&apos;re showing
                popular captions.
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              Captions you&apos;ve already voted on are excluded.
            </p>
          </div>
        </div>
      )}

      {/* Loading, error, and empty states */}
      {loading ? (
        <CaptionGridSkeleton count={8} />
      ) : error ? (
        <div className="text-center space-y-4 py-12">
          <p className="text-destructive">{error}</p>

          <button
            onClick={() => setRefreshKey((key) => key + 1)}
            className="px-6 py-2 rounded-full bg-primary/20 text-primary hover:bg-primary/30"
          >
            Try Again
          </button>
        </div>
      ) : captions.length === 0 ? (
        <div className="text-center space-y-4 py-12">
          <Sparkles className="w-16 h-16 text-muted-foreground mx-auto" />

          <p className="text-xl text-muted-foreground">No more recommendations in this batch!</p>

          <p className="text-sm text-muted-foreground">
            Refresh your feed or explore more captions on Top 100.
          </p>

          <button
            onClick={() => router.push('/top-100')}
            className="px-6 py-2 rounded-full bg-primary/20 text-primary hover:bg-primary/30"
          >
            Explore Top 100
          </button>
        </div>
      ) : (
        <div className="w-full max-w-7xl mx-auto px-4">
          {/* Recommended caption cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {visibleCaptions.map((caption) => {
              const isVoting = votingIds.includes(caption.id)

              return (
                <div
                  key={caption.id}
                  className="relative bg-white dark:bg-[#1a1a1a] rounded-lg overflow-hidden shadow-md dark:shadow-lg ring-1 ring-gray-200 dark:ring-0 hover:shadow-xl transition-all duration-300 flex flex-col w-full"
                >
                  {/* Branding and voting controls */}
                  <div className="p-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <BrandImage variant="mark" alt="Crackd" className="w-6 h-6" />
                      <span className="text-primary text-sm font-bold">Crackd</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => handleVote(caption.id, 1)}
                        disabled={isVoting}
                        aria-label="Upvote caption"
                        title="Upvote"
                        className="text-gray-500 dark:text-gray-400 hover:text-primary disabled:opacity-50"
                      >
                        <ChevronUp className="w-5 h-5" />
                      </button>

                      <span className="text-gray-900 dark:text-white text-sm font-medium">
                        {caption.like_count}
                      </span>

                      <button
                        onClick={() => handleVote(caption.id, -1)}
                        disabled={isVoting}
                        aria-label="Downvote caption"
                        title="Downvote"
                        className="text-gray-500 dark:text-gray-400 hover:text-primary disabled:opacity-50"
                      >
                        <ChevronDown className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Caption text */}
                  <div className="px-3 pb-3">
                    <p className="text-gray-900 dark:text-white text-base leading-relaxed font-medium">
                      {caption.content}
                    </p>
                  </div>

                  {/* Caption image */}
                  <div className="w-full flex-1 px-3 pb-3">
                    <img
                      src={caption.image_url}
                      alt="Caption image"
                      className="w-full h-[320px] object-contain rounded"
                      loading="lazy"
                    />
                  </div>

                  {/* Humor category */}
                  <div className="p-3 bg-gray-50 dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-white/10 flex items-center justify-between gap-2">
                    <span className="text-xs capitalize text-muted-foreground">
                      {caption.humor_style} humor
                    </span>

                    {caption.recommendation_score > 0 && (
                      <span className="flex items-center gap-1 text-xs text-primary">
                        <Sparkles className="w-3 h-3" />
                        Matches your taste
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Load more */}
          {visibleCount < captions.length && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => setVisibleCount((count) => count + 8)}
                className="px-6 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-full transition-colors"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
