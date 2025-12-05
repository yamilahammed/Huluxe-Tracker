import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { RunService } from '@/lib/services/run.service'
import { AlertService } from '@/lib/services/alert.service'
import { prisma } from '@/lib/db'

// POST /api/runs/[id]/checkin
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const run = await RunService.checkIn(id)

        // Check for late check-in and send immediate alert
        try {
            const staff = await prisma.user.findUnique({ where: { id: run.staffId } })
            await AlertService.checkLateCheckin({
                runId: run.id,
                staffName: staff?.name || 'Unknown',
                driverName: run.driverName,
                area: run.area,
                vehicleNo: run.vehicleNo,
                checkinTime: run.checkinTime!,
            })
        } catch (alertError) {
            console.error('Late check-in alert error (non-fatal):', alertError)
        }

        return NextResponse.json(run)
    } catch (error) {
        console.error('Error checking in:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
