import { load } from "cheerio"
import type { NewsItem } from "@shared/types"
import { myFetch } from "#/utils/fetch"

const cnblogs = defineSource(async () => {
  const url = "https://www.cnblogs.com/"
  const res = await myFetch(url)
  const html = await res.text()
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

  return items
})

export default defineSource({
  "cnblogs": cnblogs,
})