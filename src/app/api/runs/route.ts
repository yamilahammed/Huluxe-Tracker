import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { RunService } from '@/lib/services/run.service'
import { createRunSchema } from '@/lib/validators'
import { prisma } from '@/lib/db'

// GET /api/runs - Get all runs
export async function GET() {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const runs = await RunService.getAllRuns()
        return NextResponse.json(runs)
    } catch (error) {
        console.error('Error fetching runs:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST /api/runs - Create a new run
export async function POST(req: Request) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Ensure user exists in database
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

        const body = await req.json()
        const validation = createRunSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.issues }, { status: 400 })
        }

        const run = await RunService.createRun(user.id, validation.data)
        return NextResponse.json(run, { status: 201 })
    } catch (error) {
        console.error('Error creating run:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
