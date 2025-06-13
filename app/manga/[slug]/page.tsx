"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import MangaBanner from '@/components/manga/manga-banner'
import MangaHeader from '@/components/manga/manga-header'
import MangaDetails from '@/components/manga/manga-details'
import {
  getKitsuMangaBySlug,
  getKitsuPosterImage,
  getKitsuCoverImage,
  type KitsuManga,
  searchKitsuManga,
} from "@/lib/kitsu-api"
import { searchMangaDexManga, getMangaDexChapters, getMangaDexManga, type Chapter } from "@/lib/mangadex-api"
import LoadingSpinner from "@/components/loading-spinner"
import LibraryStatusSelector from "@/components/library/library-status-selector"
import { Button } from "@/components/ui/button"

export default function MangaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [kitsuManga, setKitsuManga] = useState<KitsuManga | null>(null)
  const [mangadexMangaId, setMangadexMangaId] = useState<string | null>(null)
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
        let currentMangadexMangaId: string | null = null
        let mangadexTitleForKitsuSearch: string | null = null

        if (mdidFromQuery) {
          currentMangadexMangaId = mdidFromQuery
          console.log("MangaDetailPage: Using mdid from query:", currentMangadexMangaId)

          const mangadexResponse = await getMangaDexManga(currentMangadexMangaId)
          const mdManga = mangadexResponse.data
          if (mdManga) {
            mangadexTitleForKitsuSearch =
              mdManga.attributes.title?.en || mdManga.attributes.title?.[Object.keys(mdManga.attributes.title)[0]] || ""
            console.log("MangaDetailPage: MangaDex title for Kitsu search:", mangadexTitleForKitsuSearch)

            const kitsuSearchData = await searchKitsuManga(mangadexTitleForKitsuSearch, 1)
            currentKitsuManga = kitsuSearchData.data[0] || null
            console.log("MangaDetailPage: Kitsu manga found via MangaDex title search:", currentKitsuManga)
          }
        } else {
          console.log("MangaDetailPage: No mdid in query. Falling back to slug-based Kitsu search.")
          currentKitsuManga = await getKitsuMangaBySlug(mangaSlug)
          console.log("MangaDetailPage: Kitsu data fetched by slug (fallback):", currentKitsuManga)

          if (currentKitsuManga) {
            mangadexTitleForKitsuSearch =
              currentKitsuManga.attributes.canonicalTitle || currentKitsuManga.attributes.titles.en_jp || ""
            console.log(
              "MangaDetailPage: Kitsu manga found by slug. Searching MangaDex for ID with title:",
              mangadexTitleForKitsuSearch,
            )
            const mangadexSearch = await searchMangaDexManga(mangadexTitleForKitsuSearch, 1)
            currentMangadexMangaId = mangadexSearch.data[0]?.id || null
            console.log("MangaDetailPage: MangaDex ID found from Kitsu title (fallback):", currentMangadexMangaId)
          }
        }

        setKitsuManga(currentKitsuManga)
        setMangadexMangaId(currentMangadexMangaId)

        if (currentMangadexMangaId) {
          const chaptersData = await getMangaDexChapters(currentMangadexMangaId)
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
          console.warn(`MangaDetailPage: No MangaDex ID determined for slug: ${mangaSlug}`)
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

  if (!kitsuManga && !mangadexMangaId) {
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

  // Prepare manga data for library operations
  const mangaData = {
    manga_id: mangadexMangaId || kitsuManga?.id || "",
    manga_title: title,
    manga_slug: mangaSlug,
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
              mangaSlug={mangaSlug}
              chapters={chapters}
            />
          </aside>
          <div className="md:col-span-2 lg:col-span-3">
            <MangaDetails
              kitsuManga={kitsuManga}
              chapters={chapters}
              mangaSlug={mangaSlug}
            />
          </div>
        </div>
      </main>
    </div>
  );
}