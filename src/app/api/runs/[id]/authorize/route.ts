import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { RunService } from '@/lib/services/run.service'
import { AlertService } from '@/lib/services/alert.service'
import { prisma } from '@/lib/db'
import fs from 'fs/promises'
import path from 'path'

// Load settings
async function getSettings() {
    const SETTINGS_FILE = path.join(process.cwd(), 'settings.json')
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf-8')
        return JSON.parse(data)
    } catch {
        return {}
    }
}

// Sync to Google Sheet
async function syncToGoogleSheet(run: {
    date: Date
    driverName: string
    deliveryPersonName: string
    area: string
    vehicleNo: string
    plg: string
    assignedShopCount: number
    deliveredCount: number | null
    checkinTime: Date | null
    checkoutTime: Date | null
    remarks: string | null
    status: string
}) {
    const settings = await getSettings()
    const sheetUrl = settings.sheetUrl || process.env.SHEET_SCRIPT_URL

    if (!sheetUrl) {
        console.log('No Google Sheet URL configured - skipping sync')
        return
    }

    try {
        const response = await fetch(sheetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: run.date.toISOString(),
                driverName: run.driverName,
                deliveryPersonName: run.deliveryPersonName,
                area: run.area,
                vehicleNo: run.vehicleNo,
                plg: run.plg,
                assignedShopCount: run.assignedShopCount,
                deliveredCount: run.deliveredCount || 0,
                checkinTime: run.checkinTime?.toISOString() || null,
                checkoutTime: run.checkoutTime?.toISOString() || null,
                remarks: run.remarks || '',
                status: run.status,
            }),
        })

        if (response.ok) {
            console.log('✅ Synced to Google Sheet successfully!')
        } else {
            console.error('Google Sheet sync failed:', await response.text())
        }
    } catch (error) {
        console.error('Google Sheet sync error:', error)
    }
}

// POST /api/runs/[id]/authorize
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get or create user in database
        let user = await prisma.user.findUnique({ where: { clerkId: userId } })

        if (!user) {
            const clerkUser = await currentUser()
            user = await prisma.user.create({
                data: {
                    clerkId: userId,
                    name: clerkUser?.fullName || 'Unknown',
                    email: clerkUser?.emailAddresses[0]?.emailAddress,
                    role: 'STAFF',
                },
            })
        }

        const { id } = await params

        // Check if run exists
        const existingRun = await prisma.run.findUnique({ where: { id } })
        if (!existingRun) {
            return NextResponse.json({ error: 'Run not found' }, { status: 404 })
        }

        const run = await RunService.authorize(id, user.id)

        // Get staff info for alerts
        const staff = await prisma.user.findUnique({ where: { id: run.staffId } })

        // Sync to Google Sheet
        try {
            await syncToGoogleSheet(run)
        } catch (sheetError) {
            console.error('Sheet sync error (non-fatal):', sheetError)
        }

        // Check for alerts (late checkout, delivery shortfall) - non-fatal
        try {
            await AlertService.checkAndSendAlerts({
                runId: run.id,
                staffName: staff?.name || 'Unknown',
                driverName: run.driverName,
                area: run.area,
                vehicleNo: run.vehicleNo,
                checkinTime: run.checkinTime || undefined,
                checkoutTime: run.checkoutTime || undefined,
                assignedShopCount: run.assignedShopCount,
                deliveredCount: run.deliveredCount || 0,
                remarks: run.remarks || undefined,
            })
        } catch (alertError) {
            console.error('Alert error (non-fatal):', alertError)
        }

        console.log('Run authorized:', run.id)
        return NextResponse.json(run)
    } catch (error) {
        console.error('Error authorizing run:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
