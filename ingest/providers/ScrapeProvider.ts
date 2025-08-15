// Lazy-require Playwright to avoid hard dependency unless scraping is enabled
// Types are intentionally 'any' to keep build working without playwright types
type Browser = any;
type Page = any;

interface ScrapingOptions {
  cookie: string;
  accounts: string[];
  intervalMinutes: number;
}

/**
 * 取得したポストのデータ構造
 */
export interface PostData {
  /** ポストのユニークID */
  id: string;
  /** 投稿者の名前 */
  author: string;
  /** ポストのテキスト本文 */
  text: string;
  /** スクリーンショット画像のファイルパス */
  screenshotPath: string;
  /** 添付されている動画のファイルパス (あれば) */
  videoPath?: string;
  /** 投稿日時 */
  createdAt: Date;
}

/**
 * プロバイダのインターフェース (将来的にScrapeProviderと共通化)
 */
export interface IngestProvider {
  getLatestPost(url: string): Promise<PostData>;
}

export class ScrapeProvider implements IngestProvider {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private authCookie: string = '';

  constructor() {}

  /**
   * Initialize headless browser. Optionally set auth cookie string for X.
   */
  async initialize(cookie?: string): Promise<void> {
    const { chromium } = require('playwright');
    this.browser = await chromium.launch({ headless: true }); // Run in headless mode
    this.page = await this.browser.newPage();
    if (cookie) {
      this.authCookie = cookie;
    }
  }

  async dispose(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  async getLatestPost(url: string): Promise<PostData> {
    // For now, assume the URL is an X account URL and scrape the latest post from it.
    // In a more robust implementation, this would parse the URL to determine if it's a specific post or an account.
    const accountMatch = url.match(/twitter\.com\/([^\/]+)/);
    if (!accountMatch || !accountMatch[1]) {
      throw new Error('Invalid X (Twitter) account URL provided.');
    }
    const account = `@${accountMatch[1]}`;

    const scrapedPosts = await this.scrapeXPosts({ cookie: this.authCookie || '', accounts: [account], intervalMinutes: 0 });

    if (scrapedPosts.length === 0) {
      throw new Error(`No posts found for account ${account}`);
    }

    // Return the first scraped post as the latest
    return scrapedPosts[0];
  }

  async scrapeXPosts(options: ScrapingOptions): Promise<PostData[]> {
    if (!this.page) {
      throw new Error('ScrapeProvider not initialized. Call initialize() first.');
    }

    console.log('Scraping X posts with options:', options);

    // Set cookies if provided
    if (options.cookie) {
      const cookies = options.cookie.split(';').map((c) => {
        const idx = c.indexOf('=');
        if (idx <= 0) return null;
        const name = c.slice(0, idx).trim();
        const value = c.slice(idx + 1).trim();
        return { name, value, domain: '.twitter.com', path: '/' };
      }).filter(Boolean);
      if (cookies.length) {
        await this.page.context().addCookies(cookies);
      }
    }

    const scrapedData: PostData[] = [];

    for (const account of options.accounts) {
      try {
        const url = `https://twitter.com/${account.replace('@', '')}`;
        console.log(`Navigating to ${url}`);
        await this.page.goto(url, { waitUntil: 'networkidle' });

        // Find the first tweet element (this selector might need adjustment based on X's HTML structure)
        const tweetElement = await this.page.$('article[data-testid="tweet"]');

        if (tweetElement) {
          const tweetText = await tweetElement.evaluate((el: any) => el.querySelector('[data-testid="tweetText"]')?.textContent || '');
          const os = require('os');
          const path = require('path');
          const fs = require('fs');
          const dir = path.join(os.tmpdir(), 'x-buzz-clip-craft');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          const screenshotPath = path.join(dir, `screenshot_${account.replace('@', '')}_${Date.now()}.png`);
          await tweetElement.screenshot({ path: screenshotPath });
          console.log(`Screenshot saved to ${screenshotPath}`);

          let videoPath: string | undefined;
          const videoElement = await tweetElement.$('video[src]');
          if (videoElement) {
            videoPath = await videoElement.getAttribute('src') || undefined;
            console.log(`Video found: ${videoPath}`);
          }

          scrapedData.push({
            id: `x-${Date.now()}`,
            author: account,
            text: tweetText,
            screenshotPath,
            videoPath, // Use extracted videoPath
            createdAt: new Date(),
          });
        } else {
          console.warn(`No tweet element found for account ${account}`);
        }

      } catch (error) {
        console.error(`Error scraping ${account}:`, error);
      }
    }

    return scrapedData;
  }

  // Placeholder for other scraping methods (TikTok, Instagram, YouTube)
  async scrapeTikTokPosts(options: ScrapingOptions): Promise<any[]> {
    console.log('Scraping TikTok posts (not implemented yet)');
    return [];
  }

  async scrapeInstagramPosts(options: ScrapingOptions): Promise<any[]> {
    console.log('Scraping Instagram posts (not implemented yet)');
    return [];
  }

  async scrapeYouTubePosts(options: ScrapingOptions): Promise<any[]> {
    console.log('Scraping YouTube posts (not implemented yet)');
    return [];
  }
}
