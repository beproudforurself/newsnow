import { load } from "cheerio"
import type { NewsItem } from "@shared/types"
import { myFetch } from "#/utils/fetch"

const cnblogs = defineSource(async () => {
  try {
    // 使用主页地址
    const url = "https://www.cnblogs.com/sitehome/p/1"
    console.log(`Fetching ${url}...`)
    const res = await myFetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': 'https://www.cnblogs.com/',
        'DNT': '1',
        'Upgrade-Insecure-Requests': '1'
      },
      credentials: 'omit' // 不发送 cookies
    })
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }
    
    const html = await res.text()
    console.log(`Successfully fetched HTML. Length: ${html.length}`)
    const $ = load(html)
  
    // 更新选择器以匹配实际的页面结构
    const items: NewsItem[] = $("article.post-item").map((_, el) => {
      const $el = $(el)
      const title = $el.find("a.post-item-title").text().trim()
      const url = $el.find("a.post-item-title").attr("href") || ""
      const author = $el.find("a.post-item-author > span").text().trim()
      
      // 提取摘要，需要移除作者链接后的文本
      const summary = $el.find("p.post-item-summary").clone()
        .find("a").remove().end()
        .text().trim()
      
      // 提取发布时间
      const time = $el.find("footer .post-meta-item > span").first().text().trim()
      
      // 提取阅读量
      const viewsText = $el.find("a.post-meta-item[title^='阅读']").text().trim()
      const views = viewsText.match(/\d+/) ? viewsText.match(/\d+/)[0] : ''
      
      return {
        id: url,
        title,
        url,
        extra: {
          info: `${author} · ${time} · 阅读 ${views}`,
          hover: summary,
        },
      }
    }).get()

    if (items.length === 0) {
      console.warn('No items found on cnblogs page. HTML content:', html.substring(0, 500))
      throw new Error('No items found on cnblogs page')
    }
    
    console.log(`Successfully extracted ${items.length} items from cnblogs`)
    return items.slice(0, 30) // 限制返回数量
  } catch (error) {
    console.error(`Error fetching cnblogs:`, error)
    if (error.response) {
      console.error(`Response status: ${error.response.status}`)
      console.error(`Response headers:`, error.response.headers)
    }
    throw error
  }
})

export default defineSource({
  "cnblogs": cnblogs,
})