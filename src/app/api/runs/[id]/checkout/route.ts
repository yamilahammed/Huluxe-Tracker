import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { RunService } from '@/lib/services/run.service'

// POST /api/runs/[id]/checkout
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
        const run = await RunService.checkOut(id)
        return NextResponse.json(run)
    } catch (error) {
        console.error('Error checking out:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
