"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { getKitsuRecentManga, type KitsuManga } from "@/lib/kitsu-api"
import { slugify } from "@/lib/slugify"
import MangaCard from "@/components/manga-card"

export default function RecentMangaSection() {
  const [updates, setUpdates] = useState<KitsuManga[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        const data = await getKitsuRecentManga(12)
        setUpdates(data.data || [])
      } catch (error) {
        console.error("Error fetching latest updates:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUpdates()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-white">Recent Manga</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-3 animate-pulse">
              <div className="aspect-[3/4] bg-gray-700 rounded-lg mb-3" />
              <div className="space-y-2">
                <div className="h-3 bg-gray-700 rounded w-full" />
                <div className="h-2 bg-gray-700 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-8">
      <div className="flex items-center gap-3">
        <Clock className="w-8 h-8 text-red-500" />
        <h2 className="text-4xl font-bold bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">
          Recent Manga
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {updates.map((item) => {
          const title = item.attributes.canonicalTitle || item.attributes.titles.en_jp || "Unknown Title"
          const posterUrl = item.attributes.posterImage?.large || 
                           item.attributes.posterImage?.medium || 
                           item.attributes.posterImage?.small || 
                           "/placeholder.svg"
          const mangaSlug = slugify(title)

          return (
            <MangaCard
              key={item.id}
              id={item.id}
              title={title}
              slug={mangaSlug}
              posterUrl={posterUrl}
              status={item.attributes.status}
              chapterCount={item.attributes.chapterCount}
            />
          )
        })}
      </div>
    </section>
  )
}