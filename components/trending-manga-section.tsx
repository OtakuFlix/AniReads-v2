"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getKitsuTrendingManga, type KitsuManga } from "@/lib/kitsu-api"
import { slugify } from "@/lib/slugify"
import MangaCard from "@/components/manga-card"

export default function TrendingMangaSection() {
  const [manga, setManga] = useState<KitsuManga[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchManga = async () => {
      try {
        const data = await getKitsuTrendingManga(20)
        setManga(data.data || [])
      } catch (error) {
        console.error("Error fetching trending manga:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchManga()
  }, [])

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, manga.length - 2))
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + Math.max(1, manga.length - 2)) % Math.max(1, manga.length - 2))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-white">Trending Manga</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-4 animate-pulse">
              <div className="aspect-[3/4] bg-gray-700 rounded-lg mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          Trending Manga
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={prevSlide}
            className="bg-gray-800/50 border-gray-700 hover:bg-gray-700 hover:border-red-500"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={nextSlide}
            className="bg-gray-800/50 border-gray-700 hover:bg-gray-700 hover:border-red-500"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out gap-6"
          style={{ transform: `translateX(-${currentIndex * 33.333}%)` }}
        >
          {manga.map((item) => {
            const title = item.attributes.canonicalTitle || item.attributes.titles.en_jp || "Unknown Title"
            const posterUrl = item.attributes.posterImage?.large || 
                             item.attributes.posterImage?.medium || 
                             item.attributes.posterImage?.small || 
                             "/placeholder.svg"
            const genres = item.relationships.genres?.data?.map((g: any) => g.attributes.name) || []
            const mangaSlug = slugify(title)

            return (
              <div key={item.id} className="flex-none w-full md:w-1/2 lg:w-1/3">
                <MangaCard
                  id={item.id}
                  title={title}
                  slug={mangaSlug}
                  posterUrl={posterUrl}
                  rating={item.attributes.averageRating ? parseFloat(item.attributes.averageRating) : undefined}
                  status={item.attributes.status}
                  genres={genres}
                  chapterCount={item.attributes.chapterCount}
                  className="h-full"
                />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}