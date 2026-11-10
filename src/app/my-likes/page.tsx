'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ThumbsUp } from 'lucide-react'
import { BrandImage } from '@/components/brand-image'
import { CaptionModal } from '@/components/ui/caption-modal'
import { checkAuthStatusAction } from '@/app/actions/auth/check-auth-status'
import { fetchLikedCaptionsAction } from '@/app/actions/captions/fetch-liked-captions-action'

type LikedCaption = {
  id: string
  content: string
  image_id: string
  image_url: string
}

export default function MyLikesPage() {
  const [captions, setCaptions] = useState<LikedCaption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [visibleCount, setVisibleCount] = useState(8)
  const router = useRouter()

  useEffect(() => {
    let active = true

    async function loadLikes() {
      try {
        const auth = await checkAuthStatusAction()

        if (!auth.isAuthenticated || auth.isAnonymous) {
          router.push('/login')
          return
        }

        const results = await fetchLikedCaptionsAction()

        if (active) {
          setCaptions(results)
        }
      } catch (err) {
        console.error('Failed to load likes:', err)
        if (active) setError('Could not load your liked captions.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadLikes()

    return () => {
      active = false
    }
  }, [router])

  const visibleCaptions = captions.slice(0, visibleCount)

  return (
    <div className="flex-1 w-full flex flex-col gap-8 p-4">
      <div className="w-full max-w-7xl mx-auto px-4 space-y-3">
        <h1 className="text-base sm:text-2xl font-normal flex items-center gap-2 text-primary">
          <ThumbsUp className="w-6 h-6" />
          My Likes
          <span className="text-primary/75 text-base sm:text-lg">({captions.length})</span>
        </h1>

        <p className="text-sm text-muted-foreground">
          Captions you've upvoted. Your likes will help personalize future recommendations.
        </p>

        {!loading && !error && (
          <div className="rounded-lg border border-primary/20 bg-background/30 p-4 max-w-xs">
            <p className="text-sm text-muted-foreground">Total captions upvoted</p>
            <p className="text-3xl font-bold text-primary mt-1">{captions.length}</p>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground">Loading your likes...</p>
      ) : error ? (
        <p className="text-center text-destructive">{error}</p>
      ) : captions.length === 0 ? (
        <div className="text-center space-y-4 py-12">
          <ThumbsUp className="w-16 h-16 text-muted-foreground mx-auto" />
          <p className="text-xl text-muted-foreground">No liked captions yet!</p>
          <p className="text-sm text-muted-foreground">Start upvoting captions to see them here.</p>
        </div>
      ) : (
        <div className="w-full max-w-7xl mx-auto p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {visibleCaptions.map((caption, index) => (
              <div
                key={caption.id}
                onClick={() => setSelectedIndex(index)}
                className="relative cursor-pointer group w-full h-full flex"
              >
                <div className="relative bg-[#1a1a1a] rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col w-full sm:max-w-[350px] sm:mx-auto h-full">
                  <div className="p-3 flex items-center gap-2">
                    <BrandImage variant="mark" alt="Crackd" className="w-6 h-6" />
                    <span className="text-primary text-sm font-bold">Crackd</span>
                  </div>

                  <div className="px-3 pb-3">
                    <p className="text-white text-base leading-relaxed font-medium line-clamp-3">
                      {caption.content}
                    </p>
                  </div>

                  <div className="w-full flex-1 min-h-[320px] px-3 pb-3">
                    <img
                      src={caption.image_url}
                      alt="Caption image"
                      className="w-full h-[320px] object-contain rounded"
                      loading="lazy"
                    />
                  </div>

                  <div className="p-3 bg-[#1a1a1a] border-t border-white/10 flex items-center gap-2 text-primary">
                    <ThumbsUp className="w-4 h-4 fill-current" />
                    <span className="text-xs">Liked</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

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

      {selectedIndex !== null && (
        <CaptionModal
          items={captions.map((caption) => ({
            id: caption.id,
            content: caption.content,
            imageUrl: caption.image_url,
          }))}
          currentIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
          onIndexChange={setSelectedIndex}
          savedCaptionIds={[]}
          onSave={() => {}}
          wrapNavigation
        />
      )}
    </div>
  )
}
