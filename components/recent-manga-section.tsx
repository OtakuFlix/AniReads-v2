"use client"

import { useEffect, useState } from "react"
import { Clock, BookOpen } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import Image from "next/image"
import { getKitsuRecentManga, getKitsuPosterImage, type KitsuManga } from "@/lib/kitsu-api"
import { slugify } from "@/lib/slugify"

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
          const posterUrl = getKitsuPosterImage(item.attributes.posterImage)
          const mangaSlug = slugify(title) // Generate slug for linking

          return (
            <Link key={item.id} href={`/manga/${mangaSlug}`} className="group relative">
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

                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="flex items-center justify-between text-white/90 text-xs">
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        <span>Ch.{item.attributes.chapterCount || "?"}</span>
                      </div>
                      <Badge className="bg-red-600/80 text-white text-xs px-1 py-0">NEW</Badge>
                    </div>
                  </div>
                </div>

                <div className="p-3 space-y-2">
                  <h3 className="font-semibold text-white group-hover:text-red-400 transition-colors text-sm line-clamp-2 leading-tight">
                    {title}
                  </h3>

                  <div className="text-xs text-gray-400">
                    {item.attributes.startDate ? new Date(item.attributes.startDate).toLocaleDateString() : "N/A"}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
