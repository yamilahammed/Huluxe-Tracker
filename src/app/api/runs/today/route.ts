import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { RunService } from '@/lib/services/run.service'
import { prisma } from '@/lib/db'

// GET /api/runs/today - Get today's run for current user
export async function GET() {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Ensure user exists
        const clerkUser = await currentUser()
        let user = await prisma.user.findUnique({ where: { clerkId: userId } })

        if (!user) {
            user = await prisma.user.create({
                data: {
                    clerkId: userId,
                    name: clerkUser?.fullName || 'Unknown',
                    email: clerkUser?.emailAddresses[0]?.emailAddress,
                    role: 'STAFF',
                },
            })
        }

        const run = await RunService.getTodayRun(user.id)
        return NextResponse.json(run)
    } catch (error) {
        console.error('Error fetching today run:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
