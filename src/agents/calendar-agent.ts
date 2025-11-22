import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { StructuredOutputParser } from '@langchain/core/output_parsers'
import { z } from 'zod'
import { google } from 'googleapis'
import { PromptTemplate } from '@langchain/core/prompts'

export interface CalendarSlot {
    start: string
    end: string
    date: string
}

export interface FreeTimeResult {
    availableSlots: CalendarSlot[]
    recommendedSlot: CalendarSlot | null
    participants: string[]
}

/**
 * Calendar Agent - Finds free time slots for all group members
 */
export class CalendarAgent {
    private llm: ChatGoogleGenerativeAI
    private calendar: any

    constructor(
        private apiKey: string,
        private googleCredentials?: any
    ) {
        this.llm = new ChatGoogleGenerativeAI({
            model: 'gemini-2.5-flash',
            temperature: 0.7,
            apiKey: apiKey
        })

        // Initialize Google Calendar API if credentials provided
        if (googleCredentials) {
            const auth = new google.auth.GoogleAuth({
                credentials: googleCredentials,
                scopes: ['https://www.googleapis.com/auth/calendar.readonly']
            })
            this.calendar = google.calendar({ version: 'v3', auth })
        }
    }

    /**
     * Find free time slots for a list of people
     * @param participants - Array of email addresses or calendar IDs
     * @param startDate - Start date for search
     * @param endDate - End date for search
     * @param duration - Duration needed in hours
     */
    async findFreeTime(
        participants: string[],
        startDate: Date,
        endDate: Date,
        duration: number = 4
    ): Promise<FreeTimeResult> {
        try {
            // If Google Calendar API is available, get real data
            if (this.calendar) {
                return await this.findFreeTimeFromCalendar(participants, startDate, endDate, duration)
            }

            // Otherwise, use LLM to analyze and suggest times
            return await this.findFreeTimeWithLLM(participants, startDate, endDate, duration)
        } catch (error) {
            console.error('Error finding free time:', error)
            throw error
        }
    }

    private async findFreeTimeFromCalendar(
        participants: string[],
        startDate: Date,
        endDate: Date,
        duration: number
    ): Promise<FreeTimeResult> {
        const timeMin = startDate.toISOString()
        const timeMax = endDate.toISOString()

        try {
            // Query free/busy information for all participants
            const freeBusyResponse = await this.calendar.freebusy.query({
                requestBody: {
                    timeMin,
                    timeMax,
                    items: participants.map(email => ({ id: email }))
                }
            })

            const calendars = freeBusyResponse.data.calendars || {}
            
            // Find common free slots
            const freeSlots = this.findCommonFreeSlots(
                calendars,
                startDate,
                endDate,
                duration
            )

            return {
                availableSlots: freeSlots,
                recommendedSlot: freeSlots[0] || null,
                participants
            }
        } catch (error) {
            console.error('Error querying calendar:', error)
            // Fall back to LLM-based suggestions
            return await this.findFreeTimeWithLLM(participants, startDate, endDate, duration)
        }
    }

    private async findFreeTimeWithLLM(
        participants: string[],
        startDate: Date,
        endDate: Date,
        duration: number
    ): Promise<FreeTimeResult> {
        const parser = StructuredOutputParser.fromZodSchema(
            z.object({
                availableSlots: z.array(
                    z.object({
                        date: z.string().describe('Date in YYYY-MM-DD format'),
                        start: z.string().describe('Start time in HH:MM format'),
                        end: z.string().describe('End time in HH:MM format')
                    })
                ),
                reasoning: z.string().describe('Why these slots are recommended')
            })
        )

        const prompt = PromptTemplate.fromTemplate(`
You are a calendar scheduling assistant. Analyze the following information and suggest optimal time slots.

Participants: {participants}
Date Range: {startDate} to {endDate}
Duration Needed: {duration} hours

Consider:
- Weekends might be better for group outings
- Avoid early mornings (before 9 AM) and late evenings (after 9 PM)
- Suggest multiple options
- Consider typical work schedules (9-5 on weekdays)

{format_instructions}
`)

        const input = await prompt.format({
            participants: participants.join(', '),
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            duration: duration.toString(),
            format_instructions: parser.getFormatInstructions()
        })

        const response = await this.llm.invoke(input)
        const parsed = await parser.parse(response.content as string)

        return {
            availableSlots: parsed.availableSlots,
            recommendedSlot: parsed.availableSlots[0] || null,
            participants
        }
    }

    private findCommonFreeSlots(
        calendars: any,
        startDate: Date,
        endDate: Date,
        duration: number
    ): CalendarSlot[] {
        const slots: CalendarSlot[] = []
        const durationMs = duration * 60 * 60 * 1000

        // Get all busy periods from all calendars
        const allBusyPeriods: Array<{ start: Date; end: Date }> = []
        
        for (const email in calendars) {
            const calendar = calendars[email]
            if (calendar.busy) {
                calendar.busy.forEach((busy: any) => {
                    allBusyPeriods.push({
                        start: new Date(busy.start),
                        end: new Date(busy.end)
                    })
                })
            }
        }

        // Sort busy periods
        allBusyPeriods.sort((a, b) => a.start.getTime() - b.start.getTime())

        // Find gaps between busy periods
        let currentTime = new Date(startDate)
        const endTime = new Date(endDate)

        while (currentTime < endTime) {
            // Find next busy period
            const nextBusy = allBusyPeriods.find(
                busy => busy.start > currentTime
            )

            const slotEnd = nextBusy ? nextBusy.start : endTime
            const availableDuration = slotEnd.getTime() - currentTime.getTime()

            if (availableDuration >= durationMs) {
                const slotEndTime = new Date(currentTime.getTime() + durationMs)
                slots.push({
                    date: currentTime.toISOString().split('T')[0],
                    start: currentTime.toTimeString().slice(0, 5),
                    end: slotEndTime.toTimeString().slice(0, 5)
                })
            }

            currentTime = nextBusy ? nextBusy.end : endTime
        }

        return slots.slice(0, 5) // Return top 5 slots
    }

    async analyzeAvailability(result: FreeTimeResult): Promise<string> {
        const prompt = `
Analyze the following availability data and provide a summary for the group:

Available Slots: ${JSON.stringify(result.availableSlots, null, 2)}
Participants: ${result.participants.join(', ')}

Provide:
1. A friendly summary of when everyone is available
2. Your top recommendation with reasoning
3. Any scheduling tips
`
        const response = await this.llm.invoke(prompt)
        return response.content as string
    }
}
