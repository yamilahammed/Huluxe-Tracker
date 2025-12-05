import { z } from 'zod'

export const createRunSchema = z.object({
    vehicleNo: z.string().min(1, 'Vehicle number is required'),
    area: z.string().min(1, 'Area is required'),
    plg: z.string().min(1, 'PLG is required'),
    assignedShopCount: z.number().min(1, 'Shop count must be at least 1'),
    driverName: z.string().min(1, 'Driver name is required'),
    deliveryPersonName: z.string().min(1, 'Delivery person name is required'),
})

export const submitEveningSchema = z.object({
    deliveredCount: z.number().min(0, 'Delivered count must be 0 or more'),
    remarks: z.string().optional(),
})

export type CreateRunInput = z.infer<typeof createRunSchema>
export type SubmitEveningInput = z.infer<typeof submitEveningSchema>
