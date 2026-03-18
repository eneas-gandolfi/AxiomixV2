/**
 * Arquivo: src/lib/scraping/apify-client.ts
 * Propósito: Cliente para integração com Apify (scraping de Instagram e TikTok)
 * Autor: AXIOMIX
 * Data: 2026-03-12
 */

// Importação condicional - funciona sem apify-client instalado
let ApifyClient: any = null;
try {
  ApifyClient = require("apify-client").ApifyClient;
} catch {
  console.warn("apify-client não instalado. Scraping desabilitado. Instale com: npm install apify-client");
}

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

if (!APIFY_TOKEN && ApifyClient) {
  console.warn("APIFY_API_TOKEN não configurado. Scraping não funcionará.");
}

export const apifyClient = APIFY_TOKEN && ApifyClient ? new ApifyClient({ token: APIFY_TOKEN }) : null;

/**
 * Instagram Post from Apify
 */
export type ApifyInstagramPost = {
  url: string;
  caption?: string;
  likesCount: number;
  commentsCount: number;
  timestamp?: string;
  ownerUsername?: string;
};

/**
 * TikTok Post from Apify
 */
export type ApifyTikTokPost = {
  webVideoUrl: string;
  text?: string;
  diggCount: number; // likes
  commentCount: number;
  shareCount: number;
  createTime?: number;
  authorMeta?: {
    name: string;
  };
};

/**
 * Scrape Instagram posts by hashtag
 */
export async function scrapeInstagramHashtag(
  hashtag: string,
  maxPosts: number = 20
): Promise<ApifyInstagramPost[]> {
  if (!apifyClient) {
    console.warn("Apify client não inicializado");
    return [];
  }

  try {
    // Instagram Hashtag Scraper by Apify
    const run = await apifyClient.actor("apify/instagram-hashtag-scraper").call({
      hashtags: [hashtag],
      resultsLimit: maxPosts,
    });

    // Pegar resultados
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

    return items as ApifyInstagramPost[];
  } catch (error) {
    console.error("Erro ao fazer scraping do Instagram:", error);
    return [];
  }
}

/**
 * Scrape TikTok posts by hashtag
 */
export async function scrapeTikTokHashtag(
  hashtag: string,
  maxPosts: number = 20
): Promise<ApifyTikTokPost[]> {
  if (!apifyClient) {
    console.warn("Apify client não inicializado");
    return [];
  }

  try {
    // TikTok Scraper by Apify
    const run = await apifyClient.actor("clockworks/tiktok-scraper").call({
      hashtags: [hashtag],
      resultsPerPage: maxPosts,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
    });

    // Pegar resultados
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

    return items as ApifyTikTokPost[];
  } catch (error) {
    console.error("Erro ao fazer scraping do TikTok:", error);
    return [];
  }
}

/**
 * Scrape Instagram profile posts
 */
export async function scrapeInstagramProfile(
  username: string,
  maxPosts: number = 20
): Promise<ApifyInstagramPost[]> {
  if (!apifyClient) {
    console.warn("Apify client não inicializado");
    return [];
  }

  try {
    const run = await apifyClient.actor("apify/instagram-profile-scraper").call({
      usernames: [username],
      resultsLimit: maxPosts,
    });

    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

    return items as ApifyInstagramPost[];
  } catch (error) {
    console.error("Erro ao fazer scraping do perfil Instagram:", error);
    return [];
  }
}
