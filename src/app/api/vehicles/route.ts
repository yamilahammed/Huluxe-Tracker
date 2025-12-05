import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

// All available vehicles
const ALL_VEHICLES = [
    { id: 'dosth', name: 'DOSTH', number: 'KL77D2260' },
    { id: 'supercarry', name: 'SUPER CARRY', number: 'KL77D2546' },
    { id: 'badadosth', name: 'BADA DOSTH', number: 'KL77D3591' },
]

// GET /api/vehicles - Get available vehicles for today
export async function GET() {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get today's date (start of day)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Get all runs for today
        const todayRuns = await prisma.run.findMany({
            where: {
                date: today,
            },
            select: {
                vehicleNo: true,
                staffId: true,
            },
        })

        // Get current user
        const currentUser = await prisma.user.findUnique({
            where: { clerkId: userId },
        })

        // Get list of used vehicle numbers
        const usedVehicles = todayRuns.map(run => run.vehicleNo)

        // Check if current user already has a run today
        const userHasRun = currentUser
            ? todayRuns.some(run => run.staffId === currentUser.id)
            : false

        // If user already has a run, show their vehicle as available (for their own run)
        const userVehicle = userHasRun && currentUser
            ? todayRuns.find(run => run.staffId === currentUser.id)?.vehicleNo
            : null

        // Filter available vehicles
        const availableVehicles = ALL_VEHICLES.map(vehicle => ({
            ...vehicle,
            available: !usedVehicles.includes(vehicle.number) || vehicle.number === userVehicle,
            usedByCurrentUser: vehicle.number === userVehicle,
        }))

        return NextResponse.json({
            vehicles: availableVehicles,
            userHasRun,
        })
    } catch (error) {
        console.error('Error fetching vehicles:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
