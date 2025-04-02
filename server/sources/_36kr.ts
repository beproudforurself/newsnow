import type { NewsItem } from "@shared/types"
import { load } from "cheerio"

// 添加延迟函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 使用直接获取HTML的方法，绕过可能的API重定向
const directFetchHtml = async (url: string, options = {}, waitTime = 0) => {
  try {
    // 使用fetch API直接请求，避免可能的中间件处理
    const response = await fetch(url, {
      ...options,
      redirect: 'follow', // 允许重定向
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const html = await response.text();
    
    // 添加延迟，等待页面完全加载
    if (waitTime > 0) {
      console.log(`Waiting ${waitTime}ms for page to fully load...`);
      await delay(waitTime);
    }
    
    return html;
  } catch (error) {
    console.error(`Error directly fetching ${url}:`, error);
    throw error;
  }
}

const quick = defineSource(async () => {
  try {
    // 使用主页地址
    const baseURL = "https://www.36kr.com"
    const url = `${baseURL}/newsflashes`
    console.log(`Fetching ${url}...`)

    // 直接获取HTML
    console.log('Using direct fetch to avoid API redirection...')
    const html = await directFetchHtml(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': 'https://www.36kr.com/',
      }
    }, 5000) // 等待5秒，确保页面完全加载
    
    console.log(`Successfully fetched HTML. Length: ${html.length}`)
    
    // 检查是否有反爬相关内容
    if (html.includes('访问受限') || html.includes('请求频率过高') || html.includes('验证码')) {
      console.error('可能遇到反爬机制，页面包含访问限制信息')
      throw new Error('页面可能被反爬拦截')
    }
    
    const $ = load(html)
    
    // 查找所有新闻快讯元素
    const newsflashItems = $(".newsflash-item")
    console.log(`Found ${newsflashItems.length} newsflash items`)
    
    if (newsflashItems.length === 0) {
      // 如果找不到文章，尝试调试页面结构
      console.log('Debug page structure:', {
        'Title': $('title').text(),
        'Body classes': $('body').attr('class'),
        'Main content elements': $('.newsflash-catalog-flow').length
      })
      
      throw new Error('No newsflash items found in page')
    }
  
    // 提取文章信息
    const news: NewsItem[] = []
    
    newsflashItems.each((_, item) => {
      const $item = $(item)
      const $titleLink = $item.find("a.item-title")
      const title = $titleLink.text().trim()
      const relativeUrl = $titleLink.attr("href") || ""
      const url = relativeUrl.startsWith("http") ? relativeUrl : `${baseURL}${relativeUrl}`
      
      // 提取时间信息
      const timeText = $item.find(".time").text().trim()
      
      // 提取描述信息
      const description = $item.find(".item-desc span").text().trim()
      
      // 提取原文链接
      const originalLink = $item.find(".item-desc a.link").attr("href") || ""
      
      if (url && title) {
        news.push({
          id: relativeUrl,
          title,
          url,
          extra: {
            info: timeText,
            hover: description,
            originalLink: originalLink || undefined
          },
        })
      }
    })

    if (news.length === 0) {
      console.error('成功找到快讯元素，但无法提取内容')
      throw new Error('No items could be extracted')
    }
    
    console.log(`Successfully extracted ${news.length} items from 36kr`)
    return news.slice(0, 30) // 限制返回数量
  } catch (error) {
    console.error(`Error fetching 36kr:`, error)
    if (error.response) {
      console.error(`Response status: ${error.response.status}`)
      console.error(`Response headers:`, error.response.headers)
    }
    
    // 返回空数组而不是抛出异常，避免整个应用崩溃
    console.log('Returning empty array due to error')
    return []
  }
})

export default defineSource({
  "36kr": quick,
  "36kr-quick": quick,
})