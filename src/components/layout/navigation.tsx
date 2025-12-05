'use client'

import { usePathname } from 'next/navigation'
import { UserButton, useUser } from '@clerk/nextjs'

export function Navigation() {
    const pathname = usePathname()
    const { user } = useUser()

    const isStaff = pathname === '/' || pathname === '/staff'
    const isAuthorizer = pathname === '/authorizer'

    // Get user role
    const role = (user?.publicMetadata?.role as string) || 'STAFF'
    const isAuthorizerRole = role === 'AUTHORIZER' || role === 'ADMIN'

    return (
        <div className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between">
            {/* Role indicator */}
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${isAuthorizerRole
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                {isAuthorizerRole ? '🔐 Authorizer' : '👷 Staff'}
            </div>

            {/* User button */}
            <UserButton
                appearance={{
                    elements: {
                        avatarBox: 'w-10 h-10 ring-2 ring-white/20',
                    },
                }}
            />
        </div>
    )
}
