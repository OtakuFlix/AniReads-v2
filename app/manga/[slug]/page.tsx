"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import MangaBanner from '@/components/manga/manga-banner'
import MangaHeader from '@/components/manga/manga-header'
import MangaDetails from '@/components/manga/manga-details'
import MangaComments from '@/components/manga/manga-comments'
import {
  getKitsuMangaBySlug,
  getKitsuPosterImage,
  getKitsuCoverImage,
  type KitsuManga,
  searchKitsuManga,
} from "@/lib/kitsu-api"
import { searchMangaDxManga, getMangaDxChapters, getMangaDxManga, type Chapter } from "@/lib/mangadx-api"
import LoadingSpinner from "@/components/loading-spinner"
import LibraryStatusSelector from "@/components/library/library-status-selector"
import { Button } from "@/components/ui/button"

export default function MangaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [kitsuManga, setKitsuManga] = useState<KitsuManga | null>(null)
  const [mangadxMangaId, setMangadxMangaId] = useState<string | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const mangaSlug = params.slug as string
  const mdidFromQuery = searchParams.get("mdid")

  useEffect(() => {
    const fetchMangaDetails = async () => {
      try {
        setLoading(true)
        console.log("MangaDetailPage: Fetching details for slug:", mangaSlug, "and mdid:", mdidFromQuery)

        let currentKitsuManga: KitsuManga | null = null
        let currentMangadxMangaId: string | null = null
        let mangadxTitleForKitsuSearch: string | null = null

        // Check if slug is actually a MangaDx ID (UUID format)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        
        if (uuidRegex.test(mangaSlug) || mdidFromQuery) {
          // Use MangaDx ID directly
          currentMangadxMangaId = mdidFromQuery || mangaSlug
          console.log("MangaDetailPage: Using MangaDx ID:", currentMangadxMangaId)

          const mangadxResponse = await getMangaDxManga(currentMangadxMangaId)
          const mdManga = mangadxResponse.data
          if (mdManga) {
            mangadxTitleForKitsuSearch =
              mdManga.attributes.title?.en || mdManga.attributes.title?.[Object.keys(mdManga.attributes.title)[0]] || ""
            console.log("MangaDetailPage: MangaDx title for Kitsu search:", mangadxTitleForKitsuSearch)

            const kitsuSearchData = await searchKitsuManga(mangadxTitleForKitsuSearch, 1)
            currentKitsuManga = kitsuSearchData.data[0] || null
            console.log("MangaDetailPage: Kitsu manga found via MangaDx title search:", currentKitsuManga)
          }
        } else {
          // Use slug for Kitsu search first
          console.log("MangaDetailPage: Using slug for Kitsu search:", mangaSlug)
          currentKitsuManga = await getKitsuMangaBySlug(mangaSlug)
          console.log("MangaDetailPage: Kitsu data fetched by slug:", currentKitsuManga)

          if (currentKitsuManga) {
            mangadxTitleForKitsuSearch =
              currentKitsuManga.attributes.canonicalTitle || currentKitsuManga.attributes.titles.en_jp || ""
            console.log("MangaDetailPage: Searching MangaDx with Kitsu title:", mangadxTitleForKitsuSearch)
            const mangadxSearch = await searchMangaDxManga(mangadxTitleForKitsuSearch, 1)
            currentMangadxMangaId = mangadxSearch.data[0]?.id || null
            console.log("MangaDetailPage: MangaDx ID found from Kitsu title:", currentMangadxMangaId)
          }
        }

        setKitsuManga(currentKitsuManga)
        setMangadxMangaId(currentMangadxMangaId)

        if (currentMangadxMangaId) {
          const chaptersData = await getMangaDxChapters(currentMangadxMangaId)
          const sortedChapters = (chaptersData.data || []).sort((a, b) => {
            const aChapter = Number.parseFloat(a.attributes.chapter || "0")
            const bChapter = Number.parseFloat(b.attributes.chapter || "0")
            const aVolume = Number.parseFloat(a.attributes.volume || "0")
            const bVolume = Number.parseFloat(b.attributes.volume || "0")

            if (aVolume !== bVolume) {
              return aVolume - bVolume
            }
            return aChapter - bChapter
          })
          setChapters(sortedChapters)
          console.log("MangaDetailPage: Chapters fetched:", sortedChapters.length)
        } else {
          console.warn(`MangaDetailPage: No MangaDx ID determined for slug: ${mangaSlug}`)
          setChapters([])
        }
      } catch (error) {
        console.error("MangaDetailPage: Error fetching manga details:", error)
        setKitsuManga(null)
        setChapters([])
      } finally {
        setLoading(false)
      }
    }

    if (mangaSlug) {
      fetchMangaDetails()
    }
  }, [mangaSlug, mdidFromQuery])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!kitsuManga && !mangadxMangaId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Manga not found</h1>
          <Button onClick={() => router.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const posterUrl = kitsuManga ? getKitsuPosterImage(kitsuManga.attributes.posterImage) : "/placeholder.svg"
  const coverUrl = kitsuManga
    ? getKitsuCoverImage(kitsuManga.attributes.coverImage) || getKitsuPosterImage(kitsuManga.attributes.posterImage)
    : "/placeholder.svg?height=400&width=1200"
  const title = kitsuManga?.attributes.canonicalTitle || kitsuManga?.attributes.titles.en_jp || "Unknown Title"
  const description = kitsuManga?.attributes.description || "No description available"

  const genres = kitsuManga?.relationships?.genres?.data?.map((g: any) => g.attributes.name) || []
  const authors = kitsuManga?.relationships?.staff?.data?.map((s: any) => s.attributes?.name || "Unknown") || []

  // Prepare manga data for library operations - use MangaDx ID as primary identifier
  const mangaData = {
    manga_id: mangadxMangaId || kitsuManga?.id || "",
    manga_title: title,
    manga_slug: mangadxMangaId || mangaSlug, // Use MangaDx ID as slug for consistency
    poster_url: kitsuManga ? getKitsuPosterImage(kitsuManga.attributes.posterImage) : '/placeholder.svg',
    total_chapters: kitsuManga?.attributes.chapterCount || chapters.length || undefined,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <MangaBanner coverUrl={coverUrl} title={title} />
      <main className="container mx-auto p-4 -mt-20 md:-mt-24 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
          <aside className="md:col-span-1 lg:col-span-1">
            <MangaHeader
              kitsuManga={kitsuManga}
              mangaData={mangaData}
              mangaSlug={mangadxMangaId || mangaSlug}
              chapters={chapters}
            />
          </aside>
          <div className="md:col-span-2 lg:col-span-3 space-y-8">
            <MangaDetails
              kitsuManga={kitsuManga}
              chapters={chapters}
              mangaSlug={mangadxMangaId || mangaSlug}
            />
            <MangaComments
              mangaId={mangadxMangaId || kitsuManga?.id || mangaSlug}
              mangaTitle={title}
            />
          </div>
        </div>
      </main>
    </div>
  );
}