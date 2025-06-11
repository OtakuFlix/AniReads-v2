"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import Image from "next/image"
import { getKitsuTrendingManga, getKitsuPosterImage, type KitsuManga } from "@/lib/kitsu-api"
import { slugify } from "@/lib/slugify"

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
            const posterUrl = getKitsuPosterImage(item.attributes.posterImage)
            const description = item.attributes.description || "No description available."
            const genres = item.relationships.genres?.data?.map((g: any) => g.attributes.name) || []
            const mangaSlug = slugify(title) // Generate slug for linking

            return (
              <Link key={item.id} href={`/manga/${mangaSlug}`} className="flex-none w-full md:w-1/2 lg:w-1/3 group">
                <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-700/50 hover:border-red-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-red-500/10">
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <Image
                      src={posterUrl || "/placeholder.svg"}
                      alt={title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-red-600 hover:bg-red-600 text-white">Trending</Badge>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors line-clamp-2">
                      {title}
                    </h3>

                    <div className="flex flex-wrap gap-2">
                      {genres.slice(0, 3).map((genre) => (
                        <Badge
                          key={genre}
                          variant="secondary"
                          className="bg-gray-700/50 text-gray-300 hover:bg-red-600/20 hover:text-red-400 text-xs"
                        >
                          {genre}
                        </Badge>
                      ))}
                    </div>

                    <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed">{description}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
