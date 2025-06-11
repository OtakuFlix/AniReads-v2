"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  BookOpen,
  Download,
  Heart,
  Share2,
  Star,
  Calendar,
  User,
  Tag,
  Book,
  Layers,
  Type,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"
import Link from "next/link"
import {
  getKitsuMangaBySlug,
  getKitsuPosterImage,
  getKitsuCoverImage,
  type KitsuManga,
  searchKitsuManga,
} from "@/lib/kitsu-api"
import { searchMangaDexManga, getMangaDexChapters, getMangaDexManga, type Chapter } from "@/lib/mangadx-api"
import LoadingSpinner from "@/components/loading-spinner"
import LibraryStatusSelector from "@/components/library/library-status-selector"

export default function MangaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [kitsuManga, setKitsuManga] = useState<KitsuManga | null>(null)
  const [mangadexMangaId, setMangadexMangaId] = useState<string | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)

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
    ? getKitsuCoverImage(kitsuManga.attributes.coverImage)
    : "/placeholder.svg?height=400&width=1200"
  const title = kitsuManga?.attributes.canonicalTitle || kitsuManga?.attributes.titles.en_jp || "Unknown Title"
  const description = kitsuManga?.attributes.description || "No description available"

  const genres = kitsuManga?.relationships?.genres?.data?.map((g: any) => g.attributes.name) || []
  const authors = kitsuManga?.relationships?.staff?.data?.map((s: any) => s.attributes?.name || "Unknown") || []

  // Prepare manga data for library operations
  const mangaData = {
    manga_id: mangadexMangaId || kitsuManga?.id || '',
    manga_title: title,
    manga_slug: mangaSlug,
    poster_url: posterUrl,
    total_chapters: kitsuManga?.attributes.chapterCount || chapters.length || undefined
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-gray-300 hover:text-white hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      {/* Banner Image */}
      <div className="relative w-full h-64 md:h-80 lg:h-96 overflow-hidden">
        <Image
          src={coverUrl || "/placeholder.svg"}
          alt={`${title} banner`}
          fill
          className="object-cover object-center"
          unoptimized
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      </div>

      <div className="container mx-auto px-4 py-8 -mt-24 relative z-10">
        {/* Hero Section */}
        <div className="relative mb-12">
          <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-8 p-8 bg-gray-800/30 backdrop-blur-sm rounded-3xl border border-gray-700/50 shadow-xl">
            {/* Cover Image */}
            <div className="lg:col-span-1 -mt-24 md:-mt-32 lg:-mt-40">
              <div className="relative w-64 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-800">
                <Image src={posterUrl || "/placeholder.svg"} alt={title} fill className="object-cover" unoptimized />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            </div>

            {/* Manga Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">{title}</h1>
                {kitsuManga?.attributes.titles.en_jp && kitsuManga.attributes.titles.en_jp !== title && (
                  <p className="text-xl text-gray-400">{kitsuManga.attributes.titles.en_jp}</p>
                )}
                {kitsuManga?.attributes.titles.ja_jp &&
                  kitsuManga.attributes.titles.ja_jp !== title &&
                  kitsuManga.attributes.titles.ja_jp !== kitsuManga.attributes.titles.en_jp && (
                    <p className="text-lg text-gray-500">({kitsuManga.attributes.titles.ja_jp})</p>
                  )}

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                    <span className="text-white font-semibold">
                      {kitsuManga?.attributes.averageRating
                        ? Number.parseFloat(kitsuManga.attributes.averageRating).toFixed(1)
                        : "N/A"}
                    </span>
                    <span className="text-gray-400">/5</span>
                  </div>
                  <Badge className="bg-red-600 hover:bg-red-600 text-white">
                    {kitsuManga?.attributes.status
                      ? kitsuManga.attributes.status.charAt(0).toUpperCase() + kitsuManga.attributes.status.slice(1)
                      : "N/A"}
                  </Badge>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 text-gray-300">
                  <User className="w-5 h-5 text-red-400" />
                  <div>
                    <span className="text-gray-400 text-sm">Author/Artist</span>
                    <p className="font-medium">{authors.join(", ") || "Unknown"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Calendar className="w-5 h-5 text-red-400" />
                  <div>
                    <span className="text-gray-400 text-sm">Published</span>
                    <p className="font-medium">
                      {kitsuManga?.attributes.startDate
                        ? new Date(kitsuManga.attributes.startDate).getFullYear()
                        : "Unknown"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Book className="w-5 h-5 text-red-400" />
                  <div>
                    <span className="text-gray-400 text-sm">Chapters</span>
                    <p className="font-medium">{kitsuManga?.attributes.chapterCount || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Layers className="w-5 h-5 text-red-400" />
                  <div>
                    <span className="text-gray-400 text-sm">Volumes</span>
                    <p className="font-medium">{kitsuManga?.attributes.volumeCount || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Type className="w-5 h-5 text-red-400" />
                  <div>
                    <span className="text-gray-400 text-sm">Type</span>
                    <p className="font-medium">
                      {kitsuManga?.attributes.mangaType
                        ? kitsuManga.attributes.mangaType
                            .replace(/_/g, " ")
                            .split(" ")
                            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(" ")
                        : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <BookOpen className="w-5 h-5 text-red-400" />
                  <div>
                    <span className="text-gray-400 text-sm">Serialization</span>
                    <p className="font-medium">{kitsuManga?.attributes.serialization || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Genres */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-red-400" />
                  <span className="text-gray-400 text-sm">Genres</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {genres.map((genre) => (
                    <Badge
                      key={genre}
                      variant="secondary"
                      className="bg-gray-800/50 text-gray-300 hover:bg-red-600/20 hover:text-red-400 border border-gray-700"
                    >
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 pt-4">
                {chapters.length > 0 && (
                  <Link href={`/reader/${mangaSlug}/${chapters[0].id}`}>
                    <Button className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white px-8 py-3 text-lg">
                      <BookOpen className="w-5 h-5 mr-2" />
                      Start Reading
                    </Button>
                  </Link>
                )}
                
                <LibraryStatusSelector 
                  mangaData={mangaData}
                />
                
                <Button variant="outline" className="border-gray-600 hover:border-red-500 text-gray-300 px-6 py-3">
                  <Download className="w-5 h-5 mr-2" />
                  Download
                </Button>
                <Button variant="outline" className="border-gray-600 hover:border-red-500 text-gray-300 px-6 py-3">
                  <Share2 className="w-5 h-5 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="description" className="space-y-6">
          <TabsList className="bg-gray-800/50 border border-gray-700">
            <TabsTrigger value="description" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
              Description
            </TabsTrigger>
            <TabsTrigger value="chapters" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
              Chapters ({chapters.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="space-y-6">
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50">
              <h3 className="text-2xl font-bold text-white mb-4">Synopsis</h3>
              <p className="text-gray-300 leading-relaxed text-lg">{description}</p>
            </div>
          </TabsContent>

          <TabsContent value="chapters" className="space-y-4">
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden">
              <div className="p-6 border-b border-gray-700">
                <h3 className="text-2xl font-bold text-white">Chapters</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {chapters.length > 0 ? (
                  chapters.map((chapter) => {
                    const scanlationGroup = chapter.relationships?.find((rel) => rel.type === "scanlation_group")
                    const groupName = scanlationGroup?.attributes?.name || "Unknown Group"

                    return (
                      <Link
                        key={chapter.id}
                        href={`/reader/${mangaSlug}/${chapter.id}`}
                        className="flex items-center justify-between p-4 hover:bg-gray-700/30 border-b border-gray-800/50 last:border-b-0 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-2 h-2 rounded-full bg-gray-600" />
                          <div>
                            <h4 className="text-white group-hover:text-red-400 transition-colors">
                              Chapter {chapter.attributes.chapter || "?"}
                              {chapter.attributes.title ? `: ${chapter.attributes.title}` : ""}
                            </h4>
                            <p className="text-gray-400 text-sm">
                              {new Date(chapter.attributes.publishAt).toLocaleDateString()} • {groupName}
                            </p>
                          </div>
                        </div>
                        <BookOpen className="w-5 h-5 text-gray-400 group-hover:text-red-400 transition-colors" />
                      </Link>
                    )
                  })
                ) : (
                  <div className="p-6 text-center text-gray-400">No chapters available</div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}