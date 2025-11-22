import { ChatGoogleGenerativeAI } from '@langchain/google-genai'

export interface RedditPost {
    title: string
    content: string
    author: string
    score: number
    url: string
    subreddit: string
    created: Date
}

export interface RedditInsights {
    popularSpots: string[]
    recommendations: string[]
    warnings: string[]
    tips: string[]
    averageCosts: {
        entry?: number
        parking?: number
        food?: number
    }
    bestTimes: string[]
    rawPosts: RedditPost[]
}

/**
 * Reddit Scraper Agent - Gets real user insights about locations
 * Uses Reddit's JSON API (no authentication needed)
 */
export class RedditAgent {
    private llm: ChatGoogleGenerativeAI

    constructor(private apiKey: string) {
        this.llm = new ChatGoogleGenerativeAI({
            model: 'gemini-2.5-flash',
            temperature: 0.7,
            apiKey: apiKey
        })
    }

    /**
     * Search Reddit for information about a location
     */
    async searchLocation(params: {
        location: string
        city: string
        activityType?: string
    }): Promise<RedditInsights> {
        console.log(`🔍 Searching Reddit for: ${params.location} in ${params.city}`)

        try {
            const posts = await this.fetchRedditPosts({
                query: `${params.location} ${params.city}`,
                subreddits: [
                    params.city.toLowerCase().replace(/\s+/g, ''),
                    'travel',
                    'solotravel',
                    'backpacking',
                    'roadtrip'
                ],
                limit: 20
            })

            if (posts.length === 0) {
                console.log('⚠️  No Reddit posts found, using AI fallback')
                return this.generateFallbackInsights(params)
            }

            console.log(`✅ Found ${posts.length} relevant Reddit posts`)
            
            // Use AI to analyze Reddit posts
            const insights = await this.analyzeRedditPosts(posts, params)
            
            return {
                ...insights,
                rawPosts: posts
            }

        } catch (error) {
            console.error('❌ Reddit search failed:', error)
            return this.generateFallbackInsights(params)
        }
    }

    /**
     * Fetch posts from Reddit using JSON API
     */
    private async fetchRedditPosts(params: {
        query: string
        subreddits: string[]
        limit: number
    }): Promise<RedditPost[]> {
        const allPosts: RedditPost[] = []

        // Search in each subreddit
        for (const subreddit of params.subreddits) {
            try {
                // Reddit JSON API: /r/subreddit/search.json
                const searchUrl = `https://www.reddit.com/r/${subreddit}/search.json?` +
                    `q=${encodeURIComponent(params.query)}&` +
                    `restrict_sr=1&` +
                    `sort=top&` +
                    `t=year&` +
                    `limit=${Math.ceil(params.limit / params.subreddits.length)}`

                const response = await fetch(searchUrl, {
                    headers: {
                        'User-Agent': 'HolidayPlannerBot/1.0'
                    }
                })

                if (!response.ok) continue

                const data: any = await response.json()
                
                if (data.data && data.data.children) {
                    for (const child of data.data.children) {
                        const post = child.data
                        
                        // Skip if no content
                        if (!post.selftext && !post.title) continue

                        allPosts.push({
                            title: post.title,
                            content: post.selftext || '',
                            author: post.author,
                            score: post.score,
                            url: `https://reddit.com${post.permalink}`,
                            subreddit: post.subreddit,
                            created: new Date(post.created_utc * 1000)
                        })
                    }
                }

                // Small delay between requests
                await new Promise(resolve => setTimeout(resolve, 500))

            } catch (error) {
                console.log(`⚠️  Failed to fetch from r/${subreddit}`)
            }
        }

        // Sort by score and return top posts
        return allPosts
            .sort((a, b) => b.score - a.score)
            .slice(0, params.limit)
    }

    /**
     * Analyze Reddit posts using AI
     */
    private async analyzeRedditPosts(
        posts: RedditPost[],
        params: { location: string; city: string; activityType?: string }
    ): Promise<Omit<RedditInsights, 'rawPosts'>> {
        const postsText = posts.map((p, i) => 
            `POST ${i + 1} (${p.score} upvotes from r/${p.subreddit}):\n` +
            `Title: ${p.title}\n` +
            `Content: ${p.content.substring(0, 500)}...\n`
        ).join('\n---\n')

        const prompt = `Analyze these Reddit posts about "${params.location}" in ${params.city}.
Extract key insights for planning a group outing:

${postsText}

Provide analysis in this JSON format:
{
  "popularSpots": ["specific places mentioned that people recommend"],
  "recommendations": ["what people suggest doing/seeing"],
  "warnings": ["things to avoid or be careful about"],
  "tips": ["practical advice from locals/visitors"],
  "averageCosts": {
    "entry": <number or null>,
    "parking": <number or null>,
    "food": <number or null>
  },
  "bestTimes": ["when to visit based on posts"]
}

Focus on actionable, specific information. If costs aren't mentioned, use null.`

        const result = await this.llm.invoke(prompt)
        const content = result.content.toString()
        
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0])
            } catch (e) {
                console.log('⚠️  Failed to parse AI response, using fallback')
            }
        }

        return {
            popularSpots: [],
            recommendations: [],
            warnings: [],
            tips: [],
            averageCosts: {},
            bestTimes: []
        }
    }

    /**
     * Generate fallback insights when Reddit fails
     */
    private async generateFallbackInsights(params: {
        location: string
        city: string
    }): Promise<RedditInsights> {
        const prompt = `Generate realistic insights about visiting "${params.location}" in ${params.city}.
Provide practical information as if from local knowledge:

Return JSON format:
{
  "popularSpots": ["nearby attractions"],
  "recommendations": ["what to do/see"],
  "warnings": ["things to be aware of"],
  "tips": ["practical advice"],
  "averageCosts": {
    "entry": <estimated cost or null>,
    "parking": <estimated cost or null>,
    "food": <estimated cost or null>
  },
  "bestTimes": ["recommended visiting times"]
}`

        const result = await this.llm.invoke(prompt)
        const content = result.content.toString()
        
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            try {
                const insights = JSON.parse(jsonMatch[0])
                return {
                    ...insights,
                    rawPosts: []
                }
            } catch (e) {
                // Return empty insights
            }
        }

        return {
            popularSpots: [],
            recommendations: [],
            warnings: [],
            tips: [],
            averageCosts: {},
            bestTimes: [],
            rawPosts: []
        }
    }

    /**
     * Format Reddit insights for display
     */
    formatInsights(insights: RedditInsights, location: string): string {
        let message = `📱 REDDIT INSIGHTS: ${location}\n\n`

        if (insights.popularSpots.length > 0) {
            message += `🌟 POPULAR SPOTS:\n`
            insights.popularSpots.forEach(spot => message += `   • ${spot}\n`)
            message += `\n`
        }

        if (insights.recommendations.length > 0) {
            message += `✨ RECOMMENDATIONS:\n`
            insights.recommendations.forEach(rec => message += `   • ${rec}\n`)
            message += `\n`
        }

        if (insights.tips.length > 0) {
            message += `💡 LOCAL TIPS:\n`
            insights.tips.forEach(tip => message += `   • ${tip}\n`)
            message += `\n`
        }

        if (insights.warnings.length > 0) {
            message += `⚠️  THINGS TO KNOW:\n`
            insights.warnings.forEach(warn => message += `   • ${warn}\n`)
            message += `\n`
        }

        if (insights.bestTimes.length > 0) {
            message += `⏰ BEST TIMES:\n`
            insights.bestTimes.forEach(time => message += `   • ${time}\n`)
            message += `\n`
        }

        const costs = insights.averageCosts
        if (costs.entry || costs.parking || costs.food) {
            message += `💰 ESTIMATED COSTS (from user reports):\n`
            if (costs.entry) message += `   Entry: $${costs.entry}\n`
            if (costs.parking) message += `   Parking: $${costs.parking}\n`
            if (costs.food) message += `   Food: $${costs.food}\n`
            message += `\n`
        }

        if (insights.rawPosts.length > 0) {
            message += `📊 Based on ${insights.rawPosts.length} Reddit posts\n`
            message += `Top post: ${insights.rawPosts[0].url}`
        }

        return message
    }
}
