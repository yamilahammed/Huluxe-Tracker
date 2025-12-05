import { prisma } from '@/lib/db'
import { CreateRunInput, SubmitEveningInput } from '@/lib/validators'
import { RunStatus } from '@prisma/client'

export class RunService {
    /**
     * Get today's run for a user
     */
    static async getTodayRun(userId: string) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        return prisma.run.findFirst({
            where: {
                staffId: userId,
                date: today,
            },
            include: {
                staff: true,
                authorizer: true,
            },
        })
    }

    /**
     * Get all runs (for authorizer)
     */
    static async getAllRuns(status?: RunStatus) {
        return prisma.run.findMany({
            where: status ? { status } : undefined,
            orderBy: { createdAt: 'desc' },
            include: {
                staff: true,
                authorizer: true,
            },
        })
    }

    /**
     * Create a new run
     */
    static async createRun(userId: string, data: CreateRunInput) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        return prisma.run.create({
            data: {
                date: today,
                staffId: userId,
                vehicleNo: data.vehicleNo,
                area: data.area,
                plg: data.plg,
                assignedShopCount: data.assignedShopCount,
                driverName: data.driverName,
                deliveryPersonName: data.deliveryPersonName,
                status: 'DRAFT',
            },
        })
    }

    /**
     * Check in
     */
    static async checkIn(runId: string) {
        return prisma.run.update({
            where: { id: runId },
            data: {
                checkinTime: new Date(),
                status: 'IN_PROGRESS',
            },
        })
    }

    /**
     * Check out
     */
    static async checkOut(runId: string) {
        return prisma.run.update({
            where: { id: runId },
            data: {
                checkoutTime: new Date(),
            },
        })
    }

    /**
     * Submit evening report
     */
    static async submitEvening(runId: string, data: SubmitEveningInput) {
        return prisma.run.update({
            where: { id: runId },
            data: {
                deliveredCount: data.deliveredCount,
                remarks: data.remarks,
                status: 'SUBMITTED',
            },
        })
    }

    /**
     * Authorize a run
     */
    static async authorize(runId: string, authorizerId: string) {
        return prisma.run.update({
            where: { id: runId },
            data: {
                authorizerId,
                status: 'AUTHORIZED',
            },
        })
    }
}
