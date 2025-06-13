"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getMangaDxTrendingWithKitsuPosters } from "@/lib/mangadx-api"
import { slugify } from "@/lib/slugify"
import MangaCard from "@/components/manga-card"

interface MangaWithKitsuPoster {
  id: string
  attributes: {
    title: Record<string, string>
    description: Record<string, string>
    status: string
    year?: number
    contentRating: string
  }
  kitsuPoster: string
  relationships: Array<{
    id: string
    type: string
    attributes?: {
      name?: string
      fileName?: string
    }
  }>
}

export default function TrendingMangaSection() {
  const [manga, setManga] = useState<MangaWithKitsuPoster[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchManga = async () => {
      try {
        // Log the MangaDx API URL
        const apiUrl = "/api/proxy/mangadx/manga?limit=20&order[followedCount]=desc&includes[]=cover_art"
        console.log("Trending MangaDx fetch URL:", apiUrl)
        const data = await getMangaDxTrendingWithKitsuPosters(20)
        setManga(data || [])
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
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        >
          {manga.map((item) => {
            // Always use the English title for slug if available, otherwise fallback to first available title
            const title = item.attributes.title.en || Object.values(item.attributes.title)[0] || "Unknown Title"
            const posterUrl = item.kitsuPoster || "/placeholder.svg"
            const description = item.attributes.description?.en || Object.values(item.attributes.description)[0] || ""
            const mangaSlug = slugify(title)
            
            // Get cover art if available
            const coverArt = item.relationships.find(
              (rel: any) => rel.type === 'cover_art' && rel.attributes?.fileName
            )
            const coverUrl = coverArt 
              ? `https://uploads.mangadx.org/covers/${item.id}/${coverArt.attributes?.fileName}.256.jpg`
              : ''

            return (
              <MangaCard
                key={item.id}
                id={item.id}
                title={title}
                slug={mangaSlug}
                posterUrl={posterUrl}
                coverUrl={coverUrl}
                description={description}
                status={item.attributes.status}
                year={item.attributes.year}
                contentRating={item.attributes.contentRating}
                useMangaDxId={true} // Use MangaDx ID for routing
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}