import { load } from "cheerio"
import type { NewsItem } from "@shared/types"
import { myFetch } from "#/utils/fetch"

const cnblogs = defineSource(async () => {
  try {
    const url = "https://www.cnblogs.com"
    console.log(`Fetching ${url}...`)
    const res = await myFetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }
    const html = await res.text()
    console.log(`Successfully fetched HTML. Length: ${html.length}`)
    const $ = load(html)
  
  const items: NewsItem[] = $(".post-item").map((_, el) => {
    const $el = $(el)
    const title = $el.find(".post-item-title").text().trim()
    const url = $el.find(".post-item-title").attr("href") || ""
    const author = $el.find(".post-item-author").text().trim()
    const summary = $el.find(".post-item-summary").text().trim()
    const time = $el.find(".post-item-foot .post-meta-item:first").text().trim()
    
    return {
      id: url,
      title,
      url,
      extra: {
        info: `${author} · ${time}`,
        hover: summary,
      },
    }
  }).get()

  console.log(`Extracted ${items.length} items from cnblogs`)
  return items
  } catch (error) {
    console.error(`Error fetching cnblogs:`, error)
    throw error
  }
})

export default defineSource({
  "cnblogs": cnblogs,
})