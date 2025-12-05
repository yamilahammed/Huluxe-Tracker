import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { RunService } from '@/lib/services/run.service'
import { submitEveningSchema } from '@/lib/validators'

// POST /api/runs/[id]/submit
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
        const body = await req.json()
        const validation = submitEveningSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.issues }, { status: 400 })
        }

        const run = await RunService.submitEvening(id, validation.data)

        return NextResponse.json(run)
    } catch (error) {
        console.error('Error submitting evening report:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
