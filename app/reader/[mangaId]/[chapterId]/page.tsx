"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Moon,
  Sun,
  Maximize,
  Camera,
  Download,
  Play,
  Pause,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import Image from "next/image"
import { getKitsuMangaBySlug, type KitsuManga } from "@/lib/kitsu-api"
import {
  searchMangaDexManga,
  getMangaDexChapter,
  getMangaDexChapterPages,
  getMangaDexChapters,
  type Chapter,
} from "@/lib/mangadex-api"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import DummyMangaPage from "@/components/dummy-manga-page"

type ReadingMode = "single" | "double" | "vertical" | "webtoon"
type Direction = "ltr" | "rtl"

export default function ReaderPage() {
  const params = useParams()
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [loadedImages, setLoadedImages] = useState<Map<number, string>>(new Map())
  const [totalPages, setTotalPages] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [zoom, setZoom] = useState(100)
  const [readingMode, setReadingMode] = useState<ReadingMode>("single")
  const [direction, setDirection] = useState<Direction>("rtl")
  const [darkMode, setDarkMode] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [autoPlay, setAutoPlay] = useState(false)
  const [autoPlayTimeout, setAutoPlayTimeout] = useState(3)
  const [pageTransition, setPageTransition] = useState(false)
  const autoHideTimer = useRef<NodeJS.Timeout | null>(null)
  const autoPlayTimer = useRef<NodeJS.Timeout | null>(null)
  const [loading, setLoading] = useState(true)
  const [mangaTitle, setMangaTitle] = useState("Loading...")
  const [chapterTitle, setChapterTitle] = useState("Loading...")
  const [kitsuManga, setKitsuManga] = useState<KitsuManga | null>(null)
  const [allMangaDexChapters, setAllMangaDexChapters] = useState<Chapter[]>([])
  const [currentMangaDexChapter, setCurrentMangaDexChapter] = useState<Chapter | null>(null)
  const [mangadexMangaId, setMangadexMangaId] = useState<string | null>(null)

  const loadingStates = useRef<Set<number>>(new Set())
  const readerRef = useRef<HTMLDivElement>(null)

  const mangaSlug = params.mangaId as string
  const chapterId = params.chapterId as string

  const hideControlsAfterDelay = useCallback(() => {
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current)
    }
    const timer = setTimeout(() => {
      setShowControls(false)
    }, 3000)
    autoHideTimer.current = timer
  }, [])

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    hideControlsAfterDelay()
  }, [hideControlsAfterDelay])

  // Auto-play functionality
  useEffect(() => {
    if (autoPlay && currentPage < totalPages) {
      autoPlayTimer.current = setTimeout(() => {
        nextPage()
      }, autoPlayTimeout * 1000)
    }
    return () => {
      if (autoPlayTimer.current) {
        clearTimeout(autoPlayTimer.current)
      }
    }
  }, [autoPlay, currentPage, totalPages, autoPlayTimeout])

  // Fullscreen detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const loadImageWithRetry = useCallback(async (pageIndex: number, url: string, retries = 3) => {
    if (loadingStates.current.has(pageIndex)) {
      return
    }

    loadingStates.current.add(pageIndex)
    setLoadedImages((prev) => new Map(prev).set(pageIndex, "loading"))

    for (let i = 0; i < retries; i++) {
      try {
        await new Promise((resolve, reject) => {
          const img = new window.Image()
          img.crossOrigin = "anonymous"
          img.onload = () => {
            setLoadedImages((prev) => new Map(prev).set(pageIndex, url))
            resolve(true)
          }
          img.onerror = (e) => {
            console.error(`Error loading image ${url} (attempt ${i + 1}):`, e)
            reject(new Error("Image load failed"))
          }
          img.src = url
        })
        return
      } catch (error) {
        if (i < retries - 1) {
          await new Promise((res) => setTimeout(res, 1000))
        }
      }
    }
    console.error(`Failed to load image ${url} after ${retries} attempts.`)
    setLoadedImages((prev) => new Map(prev).set(pageIndex, "/placeholder.svg"))
  }, [])

  // Save reading progress to cache
  const saveReadingProgress = useCallback((page: number) => {
    const readingHistory = JSON.parse(localStorage.getItem("readingHistory") || "{}")
    readingHistory[mangaSlug] = {
      lastTime: new Date().toISOString(),
      mangaId: mangadexMangaId || mangaSlug,
      mangaSlug: mangaSlug,
      mangaTitle: mangaTitle,
      chapterId: chapterId,
      chapter: currentMangaDexChapter?.attributes?.chapter || "Unknown",
      page: page,
      totalPages: totalPages,
      posterUrl: kitsuManga?.attributes?.posterImage?.medium || kitsuManga?.attributes?.posterImage?.small,
      lastRead: new Date().toISOString()
    }
    localStorage.setItem("readingHistory", JSON.stringify(readingHistory))
  }, [mangaSlug, mangadexMangaId, mangaTitle, chapterId, currentMangaDexChapter, totalPages, kitsuManga])

  useEffect(() => {
    const fetchReaderData = async () => {
      try {
        setLoading(true)
        loadingStates.current.clear()
        setLoadedImages(new Map())

        const kitsuData = await getKitsuMangaBySlug(mangaSlug)
        setKitsuManga(kitsuData)
        if (kitsuData) {
          setMangaTitle(kitsuData.attributes.canonicalTitle || kitsuData.attributes.titles.en_jp || "Unknown Manga")

          const mangadexSearch = await searchMangaDexManga(kitsuData.attributes.canonicalTitle, 1)
          const foundMangadexManga = mangadexSearch.data[0]

          if (foundMangadexManga) {
            setMangadexMangaId(foundMangadexManga.id)

            const allChaptersData = await getMangaDexChapters(foundMangadexManga.id, 100)
            const sortedChapters = (allChaptersData.data || []).sort((a, b) => {
              const aNum = Number.parseFloat(a.attributes.chapter || "0")
              const bNum = Number.parseFloat(b.attributes.chapter || "0")
              const aVol = Number.parseFloat(a.attributes.volume || "0")
              const bVol = Number.parseFloat(b.attributes.volume || "0")

              if (aVol !== bVol) {
                return aVol - bVol
              }
              return aNum - bNum
            })
            setAllMangaDexChapters(sortedChapters)

            const currentChapterDetails = await getMangaDexChapter(chapterId)
            setCurrentMangaDexChapter(currentChapterDetails.data)
            setChapterTitle(
              `Chapter ${currentChapterDetails.data?.attributes?.chapter || "?"}${
                currentChapterDetails.data?.attributes?.title ? `: ${currentChapterDetails.data.attributes.title}` : ""
              }`,
            )

            const pagesResponse = await getMangaDexChapterPages(chapterId)
            const baseUrl = pagesResponse.baseUrl
            const chapterData = pagesResponse.chapter

            if (!chapterData || !chapterData.hash || !chapterData.data) {
              console.error("MangaDex chapter data, hash, or image list is missing:", chapterData)
              setImageUrls([])
              setTotalPages(0)
              setLoading(false)
              return
            }

            const rawPageUrls = chapterData.data.map((page: string) => `${baseUrl}/data/${chapterData.hash}/${page}`)
            setImageUrls(rawPageUrls)
            setTotalPages(rawPageUrls.length)

            const readingHistory = JSON.parse(localStorage.getItem("readingHistory") || "{}")
            const savedProgress = readingHistory[mangaSlug]
            let initialPage = 1

            if (savedProgress && savedProgress.chapterId === chapterId && savedProgress.page) {
              initialPage = Math.min(savedProgress.page, rawPageUrls.length)
            }
            setCurrentPage(initialPage)

            // Save initial progress
            saveReadingProgress(initialPage)
          } else {
            console.warn(`No MangaDex entry found for Kitsu manga: ${kitsuData.attributes.canonicalTitle}`)
            setImageUrls([])
            setTotalPages(0)
          }
        } else {
          setImageUrls([])
          setTotalPages(0)
        }
      } catch (error) {
        console.error("Error fetching reader data:", error)
        setImageUrls([])
        setTotalPages(0)
      } finally {
        setLoading(false)
      }
    }

    if (mangaSlug && chapterId) {
      fetchReaderData()
    }

    hideControlsAfterDelay()
    return () => {
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current)
      }
    }
  }, [mangaSlug, chapterId, hideControlsAfterDelay, saveReadingProgress])

  // Preload images based on current page
  useEffect(() => {
    if (imageUrls.length > 0) {
      const pagesToLoad = []

      // Current page
      if (readingMode === "double") {
        pagesToLoad.push(currentPage - 1)
        if (currentPage < totalPages) pagesToLoad.push(currentPage)
      } else {
        pagesToLoad.push(currentPage - 1)
      }

      // Next few pages
      for (let i = 1; i <= 3; i++) {
        const nextPage = currentPage + i
        if (nextPage <= totalPages) {
          pagesToLoad.push(nextPage - 1)
        }
      }

      pagesToLoad.forEach((pageIndex) => {
        if (imageUrls[pageIndex] && !loadingStates.current.has(pageIndex)) {
          loadImageWithRetry(pageIndex, imageUrls[pageIndex])
        }
      })
    }
  }, [currentPage, imageUrls, totalPages, readingMode, loadImageWithRetry])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault()
          direction === "rtl" ? nextPage() : prevPage()
          break
        case "ArrowRight":
        case " ":
          e.preventDefault()
          direction === "rtl" ? prevPage() : nextPage()
          break
        case "ArrowUp":
          e.preventDefault()
          if (readingMode === "vertical" || readingMode === "webtoon") {
            readerRef.current?.scrollBy(0, -100)
          } else {
            prevPage()
          }
          break
        case "ArrowDown":
          e.preventDefault()
          if (readingMode === "vertical" || readingMode === "webtoon") {
            readerRef.current?.scrollBy(0, 100)
          } else {
            nextPage()
          }
          break
        case "Escape":
          router.push(`/manga/${mangaSlug}`)
          break
        case "f":
        case "F11":
          e.preventDefault()
          toggleFullscreen()
          break
        case "h":
          setShowControls(!showControls)
          break
      }
      showControlsTemporarily()
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [currentPage, totalPages, router, showControlsTemporarily, mangaSlug, direction, readingMode, showControls])

  const nextPage = () => {
    setPageTransition(true)
    setTimeout(() => setPageTransition(false), 300)

    const increment = readingMode === "double" ? 2 : 1
    const newPage = Math.min(currentPage + increment, totalPages)

    if (newPage > currentPage) {
      setCurrentPage(newPage)
      saveReadingProgress(newPage)
    } else if (currentPage === totalPages) {
      goToNextChapter()
    }
  }

  const prevPage = () => {
    setPageTransition(true)
    setTimeout(() => setPageTransition(false), 300)

    const decrement = readingMode === "double" ? 2 : 1
    const newPage = Math.max(currentPage - decrement, 1)

    if (newPage < currentPage) {
      setCurrentPage(newPage)
      saveReadingProgress(newPage)
    } else if (currentPage === 1) {
      goToPrevChapter()
    }
  }

  const goToNextChapter = () => {
    const currentIndex = allMangaDexChapters.findIndex((c) => c.id === chapterId)
    if (currentIndex !== -1 && currentIndex < allMangaDexChapters.length - 1) {
      router.push(`/reader/${mangaSlug}/${allMangaDexChapters[currentIndex + 1].id}`)
    }
  }

  const goToPrevChapter = () => {
    const currentIndex = allMangaDexChapters.findIndex((c) => c.id === chapterId)
    if (currentIndex > 0) {
      router.push(`/reader/${mangaSlug}/${allMangaDexChapters[currentIndex - 1].id}`)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const handleScreenshot = () => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      alert("Canvas not supported")
      return
    }

    const currentImageUrl = loadedImages.get(currentPage - 1)
    if (!currentImageUrl || currentImageUrl === "loading" || currentImageUrl === "/placeholder.svg") {
      alert("Image not loaded yet")
      return
    }

    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.href = url
          link.download = `${mangaTitle}_Chapter_${currentMangaDexChapter?.attributes.chapter}_Page_${currentPage}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        }
      }, "image/png")
    }
    img.onerror = () => {
      alert("Failed to load image for screenshot")
    }
    img.src = currentImageUrl
  }

  const handleDownloadPage = () => {
    const currentImageUrl = loadedImages.get(currentPage - 1)
    if (currentImageUrl && currentImageUrl !== "loading" && currentImageUrl !== "/placeholder.svg") {
      const link = document.createElement("a")
      link.href = currentImageUrl
      link.download = `${mangaTitle}_Chapter_${currentMangaDexChapter?.attributes.chapter}_Page_${currentPage}.png`
      link.target = "_blank"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      alert("Image not available for download yet.")
    }
  }

  const renderPage = (pageIndex: number, isSecondPage = false) => {
    const imageUrl = loadedImages.get(pageIndex)
    const isLoaded = imageUrl && imageUrl !== "loading"

    return (
      <div
        key={pageIndex}
        className={`relative flex-shrink-0 ${
          readingMode === "double" ? "w-1/2" : "w-full"
        } h-full flex items-center justify-center ${
          pageTransition ? "transition-transform duration-300 ease-in-out" : ""
        }`}
      >
        {isLoaded ? (
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt={`Page ${pageIndex + 1}`}
            width={800}
            height={1200}
            className={`max-w-full max-h-full object-contain ${
              readingMode === "vertical" || readingMode === "webtoon" ? "w-full h-auto" : "h-full w-auto"
            }`}
            style={{
              transform: `scale(${zoom / 100})`,
              filter: darkMode ? "none" : "brightness(1.1) contrast(1.05)",
            }}
            unoptimized
            priority={pageIndex === currentPage - 1}
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center rounded-lg">
            <div className="animate-pulse w-1/2 h-1/2 bg-gray-700 rounded-md" />
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <DummyMangaPage />
      </div>
    )
  }

  if (!kitsuManga || imageUrls.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Chapter not found</h1>
          <Button onClick={() => router.push(`/manga/${mangaSlug}`)} variant="outline">
            Go Back to Manga Details
          </Button>
        </div>
      </div>
    )
  }

  const canGoToPrevChapter = allMangaDexChapters.findIndex((c) => c.id === chapterId) > 0
  const canGoToNextChapter = allMangaDexChapters.findIndex((c) => c.id === chapterId) < allMangaDexChapters.length - 1

  return (
    <TooltipProvider>
      <div
        ref={readerRef}
        className={`min-h-screen ${darkMode ? "bg-black" : "bg-gray-100"} relative overflow-hidden select-none`}
        onClick={showControlsTemporarily}
      >
        {/* Navigation Zones */}
        <div
          className={`absolute ${direction === "rtl" ? "right-0" : "left-0"} top-0 w-1/3 h-full z-20 cursor-pointer`}
          onClick={(e) => {
            e.stopPropagation()
            direction === "rtl" ? nextPage() : prevPage()
          }}
        />
        <div
          className={`absolute ${direction === "rtl" ? "left-0" : "right-0"} top-0 w-1/3 h-full z-20 cursor-pointer`}
          onClick={(e) => {
            e.stopPropagation()
            direction === "rtl" ? prevPage() : nextPage()
          }}
        />

        {/* Top Controls */}
        <div
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            showControls ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
          }`}
        >
          <div className="bg-black/95 backdrop-blur-md border-b border-gray-800/50">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/manga/${mangaSlug}`)}
                      className="text-white hover:bg-gray-800"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Back to Manga Details</TooltipContent>
                </Tooltip>
                <div className="text-white">
                  <h1 className="font-semibold text-sm">{chapterTitle}</h1>
                  <p className="text-xs text-gray-400">
                    Page {currentPage} of {totalPages}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAutoPlay(!autoPlay)}
                      className={`text-white hover:bg-gray-800 ${autoPlay ? "bg-red-600/20 text-red-400" : ""}`}
                    >
                      {autoPlay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{autoPlay ? "Pause Auto-play" : "Start Auto-play"}</TooltipContent>
                </Tooltip>

                {autoPlay && (
                  <Select
                    value={autoPlayTimeout.toString()}
                    onValueChange={(value) => setAutoPlayTimeout(Number(value))}
                  >
                    <SelectTrigger className="w-20 h-8 bg-gray-800 border-gray-700 text-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1s</SelectItem>
                      <SelectItem value="2">2s</SelectItem>
                      <SelectItem value="3">3s</SelectItem>
                      <SelectItem value="5">5s</SelectItem>
                      <SelectItem value="10">10s</SelectItem>
                      <SelectItem value="30">30s</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDarkMode(!darkMode)}
                      className="text-white hover:bg-gray-800"
                    >
                      {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{darkMode ? "Light Mode" : "Dark Mode"}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleFullscreen}
                      className="text-white hover:bg-gray-800"
                    >
                      <Maximize className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Toggle Fullscreen</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        {/* Reading Area */}
        <div className="h-screen flex items-center justify-center p-4 pt-16 pb-20">
          {readingMode === "vertical" || readingMode === "webtoon" ? (
            <div className="max-w-4xl mx-auto space-y-1 overflow-y-auto h-full">
              {imageUrls.map((_, index) => renderPage(index))}
            </div>
          ) : readingMode === "double" ? (
            <div className="flex h-full max-w-6xl mx-auto">
              {direction === "rtl" ? (
                <>
                  {currentPage < totalPages && renderPage(currentPage, true)}
                  {renderPage(currentPage - 1)}
                </>
              ) : (
                <>
                  {renderPage(currentPage - 1)}
                  {currentPage < totalPages && renderPage(currentPage, true)}
                </>
              )}
            </div>
          ) : (
            <div className="h-full w-full flex items-center justify-center">{renderPage(currentPage - 1)}</div>
          )}
        </div>

        {/* Bottom Controls */}
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
            showControls ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
          }`}
        >
          <div className="bg-black/95 backdrop-blur-md border-t border-gray-800/50">
            <div className="p-3 space-y-3">
              {/* Page Navigation */}
              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToPrevChapter}
                      className="text-white hover:bg-gray-800"
                      disabled={!canGoToPrevChapter}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Previous Chapter</TooltipContent>
                </Tooltip>

                <div className="flex-1 px-2">
                  <Slider
                    value={[currentPage]}
                    onValueChange={(value) => {
                      setCurrentPage(value[0])
                      saveReadingProgress(value[0])
                    }}
                    max={totalPages}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToNextChapter}
                      className="text-white hover:bg-gray-800"
                      disabled={!canGoToNextChapter}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Next Chapter</TooltipContent>
                </Tooltip>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setZoom(Math.max(50, zoom - 25))}
                          className="text-white hover:bg-gray-800"
                        >
                          <ZoomOut className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Zoom Out</TooltipContent>
                    </Tooltip>
                    <span className="text-white text-xs w-10 text-center">{zoom}%</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setZoom(Math.min(200, zoom + 25))}
                          className="text-white hover:bg-gray-800"
                        >
                          <ZoomIn className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Zoom In</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setZoom(100)}
                          className="text-white hover:bg-gray-800"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Reset Zoom</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Reading Mode */}
                  <Select value={readingMode} onValueChange={(value: ReadingMode) => setReadingMode(value)}>
                    <SelectTrigger className="w-32 h-8 bg-gray-800 border-gray-700 text-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Page</SelectItem>
                      <SelectItem value="double">Double Page</SelectItem>
                      <SelectItem value="vertical">Vertical</SelectItem>
                      <SelectItem value="webtoon">Webtoon</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Direction */}
                  <Select value={direction} onValueChange={(value: Direction) => setDirection(value)}>
                    <SelectTrigger className="w-20 h-8 bg-gray-800 border-gray-700 text-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rtl">RTL</SelectItem>
                      <SelectItem value="ltr">LTR</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Actions */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleScreenshot}
                        className="text-white hover:bg-gray-800"
                      >
                        <Camera className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Screenshot</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownloadPage}
                        className="text-white hover:bg-gray-800"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}