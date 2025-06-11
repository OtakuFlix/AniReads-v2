import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const [apiName, ...apiPathSegments] = params.path
    const apiPath = apiPathSegments.join("/")
    const searchParams = request.nextUrl.searchParams.toString()

    let baseUrl: string | undefined
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    switch (apiName) {
      case "mangadex":
        baseUrl = process.env.MANGADEX_API_URL
        break
      case "kitsu":
        baseUrl = process.env.KITSU_API_URL
        break
      default:
        return NextResponse.json({ error: "Invalid API name" }, { status: 400 })
    }

    if (!baseUrl) {
      return NextResponse.json({ error: `Base URL for ${apiName} not configured` }, { status: 500 })
    }

    const url = `${baseUrl}/${apiPath}${searchParams ? `?${searchParams}` : ""}`

    console.log("Proxy GET Fetching URL:", url)

    const response = await fetch(url, {
      headers: headers,
    })

    // Check if the response is not OK (e.g., 404, 500)
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Proxy GET Error Response (${response.status}):`, errorText)
      return NextResponse.json(
        { error: `API request failed: ${response.statusText}`, details: errorText },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log("Proxy GET Received Response:", data)
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Proxy GET error:", error)
    return NextResponse.json({ error: "Failed to fetch data via proxy" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const [apiName, ...apiPathSegments] = params.path
    const apiPath = apiPathSegments.join("/")
    const body = await request.json()

    let baseUrl: string | undefined
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    switch (apiName) {
      case "mangadex":
        baseUrl = process.env.MANGADEX_API_URL
        break
      case "kitsu":
        baseUrl = process.env.KITSU_API_URL
        break
      default:
        return NextResponse.json({ error: "Invalid API name" }, { status: 400 })
    }

    if (!baseUrl) {
      return NextResponse.json({ error: `Base URL for ${apiName} not configured` }, { status: 500 })
    }

    const url = `${baseUrl}/${apiPath}`

    console.log("Proxy POSTing to URL:", url)
    console.log("Proxy POST Request Body:", body)

    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    })

    // Check if the response is not OK (e.g., 404, 500)
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Proxy POST Error Response (${response.status}):`, errorText)
      return NextResponse.json(
        { error: `API request failed: ${response.statusText}`, details: errorText },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log("Proxy POST Received Response:", data)
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Proxy POST error:", error)
    return NextResponse.json({ error: "Failed to post data via proxy" }, { status: 500 })
  }
}
