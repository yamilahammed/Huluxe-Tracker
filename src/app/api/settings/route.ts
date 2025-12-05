import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import fs from 'fs/promises'
import path from 'path'

const SETTINGS_FILE = path.join(process.cwd(), 'settings.json')

// GET /api/settings
export async function GET() {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        try {
            const data = await fs.readFile(SETTINGS_FILE, 'utf-8')
            return NextResponse.json(JSON.parse(data))
        } catch {
            return NextResponse.json({
                sheetUrl: '',
                checkinLimit: '09:00',
                checkoutLimit: '18:00',
            })
        }
    } catch (error) {
        console.error('Error fetching settings:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST /api/settings
export async function POST(req: Request) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()

        // Ensure all settings are saved
        const settingsToSave = {
            sheetUrl: body.sheetUrl || '',
            checkinLimit: body.checkinLimit || '09:00',
            checkoutLimit: body.checkoutLimit || '18:00',
        }

        await fs.writeFile(SETTINGS_FILE, JSON.stringify(settingsToSave, null, 2))

        // Update environment variables for immediate use
        if (body.sheetUrl) {
            process.env.SHEET_SCRIPT_URL = body.sheetUrl
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error saving settings:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
