import { load } from "cheerio"
import type { NewsItem } from "@shared/types"

// 根据环境可能需要导入fetch
// 在浏览器环境，fetch是全局可用的
// 在Node.js环境，可能需要从node-fetch或其他库导入
// 这里假设fetch是全局可用的，如果不是，请适当导入

// 使用直接获取HTML的方法，绕过可能的API重定向
const directFetchHtml = async (url: string, options = {}) => {
  try {
    // 使用fetch API直接请求，避免可能的中间件处理
    const response = await fetch(url, {
      ...options,
      redirect: 'follow', // 允许重定向
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Error directly fetching ${url}:`, error);
    throw error;
  }
}

const cnblogs = defineSource(async () => {
  try {
    // 使用主页地址
    const url = "https://www.cnblogs.com/sitehome/p/1"
    console.log(`Fetching ${url}...`)

    // 尝试直接获取HTML，绕过可能的中间件处理
    console.log('Trying direct fetch to avoid API redirection...')
    const html = await directFetchHtml(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': 'https://www.cnblogs.com/',
      }
    })
    
    console.log(`Successfully fetched HTML. Length: ${html.length}`)
    
    // 检查是否有反爬相关内容
    if (html.includes('访问受限') || html.includes('请求频率过高') || html.includes('验证码')) {
      console.error('可能遇到反爬机制，页面包含访问限制信息')
      throw new Error('页面可能被反爬拦截')
    }
    
    const $ = load(html)
    
    // 检查页面结构
    const hasPostList = $('#post_list').length > 0
    console.log(`Post list container found: ${hasPostList}`)
    
    // 查找所有文章元素
    const articleElements = $("#post_list article.post-item")
    console.log(`Found ${articleElements.length} article elements`)
    
    if (articleElements.length === 0) {
      // 如果找不到文章，尝试调试页面结构
      console.log('Debug page structure:', {
        'Title': $('title').text(),
        'Body classes': $('body').attr('class'),
        'Main content elements': $('main').length,
        'Article elements anywhere': $('article').length
      })
      
      // 尝试其他可能的选择器
      const alternativeArticles = $(".post-list article, article.post-item")
      console.log(`Found ${alternativeArticles.length} articles with alternative selector`)
      
      if (alternativeArticles.length > 0) {
        console.log('Using alternative selector for articles')
        articleElements = alternativeArticles
      }
    }
  
    // 提取文章信息
    const items: NewsItem[] = articleElements.map((_, el) => {
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
      const viewsElem = $el.find("a.post-meta-item[title^='阅读']")
      const viewsText = viewsElem.text().trim()
      const views = viewsText.match(/\d+/) ? viewsText.match(/\d+/)[0] : ''
      
      // 提取评论数
      const commentElem = $el.find("a.post-meta-item[title^='评论']")
      const commentText = commentElem.text().trim()
      const comments = commentText.match(/\d+/) ? commentText.match(/\d+/)[0] : '0'
      
      // 提取推荐数
      const likeElem = $el.find("a.post-meta-item[title^='推荐']")
      const likeText = likeElem.text().trim()
      const likes = likeText.match(/\d+/) ? likeText.match(/\d+/)[0] : '0'
      
      return {
        id: url,
        title,
        url,
        extra: {
          info: `${author} · ${time} · 阅读 ${views} · 评论 ${comments} · 推荐 ${likes}`,
          hover: summary,
        },
      }
    }).get()

    if (items.length === 0) {
      console.error('No items found on cnblogs page')
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
    
    // 返回空数组而不是抛出异常，避免整个应用崩溃
    console.log('Returning empty array due to error')
    return []
  }
})

export default defineSource({
  "cnblogs": cnblogs,
})