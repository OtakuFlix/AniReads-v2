'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, Plus } from 'lucide-react'
import QuickAddDialog from '@/components/library/quick-add-dialog'

interface MangaCardProps {
  id: string
  title: string
  slug: string
  posterUrl: string
  rating?: string | number
  status?: string
  genres?: string[]
  chapterCount?: number | null
  showAddButton?: boolean
  className?: string
}

export default function MangaCard({
  id,
  title,
  slug,
  posterUrl,
  rating,
  status,
  genres = [],
  chapterCount,
  showAddButton = true,
  className = ''
}: MangaCardProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  const mangaData = {
    manga_id: id,
    manga_title: title,
    manga_slug: slug,
    poster_url: posterUrl,
    total_chapters: chapterCount
  }

  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowQuickAdd(true)
  }

  return (
    <>
      <div className={`group relative ${className}`}>
        <Link href={`/manga/${slug}`} className="block">
          <div className="relative bg-gradient-to-br from-gray-800/30 to-gray-900/30 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-700/30 hover:border-red-500/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-red-500/20">
            <div className="relative aspect-[3/4] overflow-hidden">
              <Image
                src={posterUrl || "/placeholder.svg"}
                alt={title}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              {/* Add to Library Button */}
              {showAddButton && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Button
                    onClick={handleAddClick}
                    size="icon"
                    className="bg-red-600/90 hover:bg-red-700 text-white rounded-full w-8 h-8 shadow-lg"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Rating and Status */}
              <div className="absolute bottom-2 left-2 right-2">
                <div className="flex items-center justify-between text-white/90 text-xs">
                  {rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-current" />
                      <span>{typeof rating === 'string' ? parseFloat(rating).toFixed(1) : rating.toFixed(1)}</span>
                    </div>
                  )}
                  {chapterCount && (
                    <span>Ch.{chapterCount}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 space-y-2">
              <h3 className="font-semibold text-white group-hover:text-red-400 transition-colors text-sm line-clamp-2 leading-tight">
                {title}
              </h3>
              
              {genres.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {genres.slice(0, 2).map((genre) => (
                    <Badge
                      key={genre}
                      variant="secondary"
                      className="bg-gray-700/50 text-gray-300 text-xs"
                    >
                      {genre}
                    </Badge>
                  ))}
                </div>
              )}

              {status && (
                <div className="text-xs text-gray-400">
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </div>
              )}
            </div>
          </div>
        </Link>
      </div>

      <QuickAddDialog
        open={showQuickAdd}
        onOpenChange={setShowQuickAdd}
        mangaData={mangaData}
      />
    </>
  )
}