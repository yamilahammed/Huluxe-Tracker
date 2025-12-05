import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-white tracking-tight mb-2">HULUXE</h1>
                <p className="text-blue-300 text-sm mb-8">Delivery Tracker</p>
                <SignUp
                    appearance={{
                        elements: {
                            formButtonPrimary: 'bg-blue-500 hover:bg-blue-600',
                            card: 'bg-white/10 backdrop-blur-lg border-0',
                        }
                    }}
                />
            </div>
        </div>
    )
}
