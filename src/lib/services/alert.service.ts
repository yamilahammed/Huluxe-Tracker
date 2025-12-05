import { Resend } from 'resend'
import fs from 'fs/promises'
import path from 'path'

interface AlertData {
    runId: string
    staffName: string
    driverName: string
    area: string
    vehicleNo: string
    checkinTime?: Date
    checkoutTime?: Date
    assignedShopCount: number
    deliveredCount: number
    remarks?: string
}

interface CheckinAlertData {
    runId: string
    staffName: string
    driverName: string
    area: string
    vehicleNo: string
    checkinTime: Date
}

// Load settings
async function getSettings() {
    const SETTINGS_FILE = path.join(process.cwd(), 'settings.json')
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf-8')
        return JSON.parse(data)
    } catch {
        return { checkinLimit: '09:00', checkoutLimit: '18:00' }
    }
}

// Format time in 12-hour IST
function formatTimeIST(date: Date): string {
    return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
    })
}

// Format time limit for display
function formatLimitTime(time24: string): string {
    const [hours, minutes] = time24.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

export class AlertService {
    private static resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

    // Check late check-in immediately when staff checks in
    static async checkLateCheckin(data: CheckinAlertData) {
        const settings = await getSettings()

        if (!settings.checkinLimit) return

        const [limitHour, limitMin] = settings.checkinLimit.split(':').map(Number)
        const checkinDate = new Date(data.checkinTime)

        // Get check-in time in IST
        const istCheckin = new Date(checkinDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
        const checkinHour = istCheckin.getHours()
        const checkinMinute = istCheckin.getMinutes()

        // Compare times
        const checkinMinutes = checkinHour * 60 + checkinMinute
        const limitMinutes = limitHour * 60 + limitMin

        if (checkinMinutes > limitMinutes) {
            const alert = `⚠️ LATE CHECK-IN: ${data.driverName} checked in at ${formatTimeIST(checkinDate)} (limit: ${formatLimitTime(settings.checkinLimit)})`
            await this.sendLateCheckinEmail(data, alert)
        }
    }

    // Send email for late check-in
    static async sendLateCheckinEmail(data: CheckinAlertData, alert: string) {
        const adminEmail = process.env.ADMIN_EMAIL

        const emailBody = `
HULUXE DELIVERY TRACKER - LATE CHECK-IN ALERT
==============================================

${alert}

RUN DETAILS:
- Driver: ${data.driverName}
- Staff: ${data.staffName}
- Area: ${data.area}
- Vehicle: ${data.vehicleNo}
- Date: ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
- Check-in Time: ${formatTimeIST(new Date(data.checkinTime))}

---
This is an automated alert from Huluxe Delivery Tracker.
    `.trim()

        // Log to console (always)
        console.log('\n========== LATE CHECK-IN ALERT ==========')
        console.log('To:', adminEmail || 'No admin email configured')
        console.log('Subject: Huluxe Alert - LATE CHECK-IN')
        console.log('\n' + emailBody)
        console.log('==========================================\n')

        // Send via Resend if configured
        if (this.resend && adminEmail) {
            try {
                await this.resend.emails.send({
                    from: 'Huluxe Tracker <onboarding@resend.dev>',
                    to: adminEmail,
                    subject: `Huluxe Alert: LATE CHECK-IN - ${data.driverName}`,
                    text: emailBody,
                })
                console.log('✅ Late check-in alert email sent!')
            } catch (error) {
                console.error('Failed to send email:', error)
            }
        }
    }

    // Check alerts at authorization (delivery shortfall only now)
    static async checkAndSendAlerts(data: AlertData) {
        const alerts: string[] = []

        // Check only delivery shortfall (late checkin is handled separately)
        if (data.deliveredCount < data.assignedShopCount) {
            const shortfall = data.assignedShopCount - data.deliveredCount
            const percentage = Math.round((data.deliveredCount / data.assignedShopCount) * 100)
            alerts.push(`⚠️ DELIVERY SHORTFALL: ${data.driverName} delivered only ${data.deliveredCount}/${data.assignedShopCount} shops (${percentage}%, ${shortfall} short)`)
        }

        // If there are alerts, send email
        if (alerts.length > 0) {
            await this.sendAlertEmail(data, alerts)
        }

        return alerts
    }

    static async sendAlertEmail(data: AlertData, alerts: string[]) {
        const adminEmail = process.env.ADMIN_EMAIL

        const emailBody = `
HULUXE DELIVERY TRACKER - ALERT
================================

${alerts.join('\n\n')}

RUN DETAILS:
- Driver: ${data.driverName}
- Staff: ${data.staffName}
- Area: ${data.area}
- Vehicle: ${data.vehicleNo}
- Date: ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
- Check-in: ${data.checkinTime ? formatTimeIST(new Date(data.checkinTime)) : 'N/A'}
- Check-out: ${data.checkoutTime ? formatTimeIST(new Date(data.checkoutTime)) : 'N/A'}
- Shop Assigned: ${data.assignedShopCount}
- Shop Delivered: ${data.deliveredCount}
- Remarks: ${data.remarks || 'None'}

---
This is an automated alert from Huluxe Delivery Tracker.
    `.trim()

        // Log to console (always)
        console.log('\n========== DELIVERY ALERT ==========')
        console.log('To:', adminEmail || 'No admin email configured')
        console.log('Subject: Huluxe Alert - DELIVERY SHORTFALL')
        console.log('\n' + emailBody)
        console.log('=====================================\n')

        // Send via Resend if configured
        if (this.resend && adminEmail) {
            try {
                await this.resend.emails.send({
                    from: 'Huluxe Tracker <onboarding@resend.dev>',
                    to: adminEmail,
                    subject: `Huluxe Alert: DELIVERY SHORTFALL - ${data.driverName}`,
                    text: emailBody,
                })
                console.log('✅ Delivery alert email sent!')
            } catch (error) {
                console.error('Failed to send email:', error)
            }
        }
    }
}
