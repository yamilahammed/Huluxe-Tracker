'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@clerk/nextjs'
import { Navigation } from '@/components/layout/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface Run {
    id: string
    date: string
    vehicleNo: string
    area: string
    plg: string
    assignedShopCount: number
    deliveredCount: number | null
    driverName: string
    deliveryPersonName: string
    checkinTime: string | null
    checkoutTime: string | null
    remarks: string | null
    status: string
}

interface User {
    id: string
    clerkId: string
    name: string
    email: string | null
    role: string
}

export default function AuthorizerPage() {
    const { user, isLoaded } = useUser()
    const queryClient = useQueryClient()
    const [newUser, setNewUser] = useState({ name: '', email: '', role: 'STAFF' })
    const [settings, setSettings] = useState({ sheetUrl: '', checkinLimit: '09:00', checkoutLimit: '18:00' })
    const [dialogOpen, setDialogOpen] = useState(false)

    // Load saved settings on mount + role-based redirect
    useEffect(() => {
        // Role-based redirect: STAFF users go to /
        if (isLoaded && user) {
            const role = (user.publicMetadata?.role as string) || 'STAFF'
            if (role === 'STAFF') {
                window.location.href = '/'
                return
            }
        }

        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                if (data && !data.error) {
                    setSettings({
                        sheetUrl: data.sheetUrl || '',
                        checkinLimit: data.checkinLimit || '09:00',
                        checkoutLimit: data.checkoutLimit || '18:00',
                    })
                }
            })
            .catch(() => { })
    }, [isLoaded, user])

    // Fetch runs
    const { data: runs, isLoading: runsLoading } = useQuery({
        queryKey: ['allRuns'],
        queryFn: async () => {
            const res = await fetch('/api/runs')
            if (!res.ok) throw new Error('Failed to fetch')
            return res.json() as Promise<Run[]>
        },
        staleTime: 30000,
    })

    // Fetch users
    const { data: users, isLoading: usersLoading } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await fetch('/api/users')
            if (!res.ok) throw new Error('Failed to fetch')
            return res.json() as Promise<User[]>
        },
    })

    // Authorize run
    const authorize = useMutation({
        mutationFn: async (runId: string) => {
            const res = await fetch(`/api/runs/${runId}/authorize`, { method: 'POST' })
            if (!res.ok) throw new Error('Failed')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allRuns'] })
            toast.success('Run authorized & synced!')
        },
        onError: () => toast.error('Authorization failed'),
    })

    // Create user
    const createUser = useMutation({
        mutationFn: async (data: typeof newUser) => {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            if (!res.ok) throw new Error('Failed')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            toast.success('User created!')
            setNewUser({ name: '', email: '', role: 'STAFF' })
            setDialogOpen(false)
        },
        onError: () => toast.error('Failed to create user'),
    })

    // Update user role
    const updateUserRole = useMutation({
        mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
            const res = await fetch(`/api/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role }),
            })
            if (!res.ok) throw new Error('Failed')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] })
            toast.success('Role updated!')
        },
        onError: () => toast.error('Failed to update role'),
    })

    // Save settings
    const saveSettings = useMutation({
        mutationFn: async (data: typeof settings) => {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            if (!res.ok) throw new Error('Failed')
            return res.json()
        },
        onSuccess: () => {
            toast.success('Settings saved!')
        },
        onError: () => toast.error('Failed to save settings'),
    })

    const submittedRuns = runs?.filter(r => r.status === 'SUBMITTED') || []
    const authorizedRuns = runs?.filter(r => r.status === 'AUTHORIZED') || []

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 pb-20">
            <Navigation />

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center py-4">
                    <h1 className="text-4xl font-bold text-white tracking-tight">HULUXE</h1>
                    <p className="text-purple-300 text-sm mt-1">Authorizer Dashboard</p>
                </div>

                <Tabs defaultValue="runs" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 bg-white/10 mb-6">
                        <TabsTrigger value="runs" className="data-[state=active]:bg-purple-500">
                            Runs
                        </TabsTrigger>
                        <TabsTrigger value="users" className="data-[state=active]:bg-purple-500">
                            Users
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="data-[state=active]:bg-purple-500">
                            Settings
                        </TabsTrigger>
                    </TabsList>

                    {/* RUNS TAB */}
                    <TabsContent value="runs" className="space-y-6">
                        {/* Pending Authorization */}
                        <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-lg overflow-hidden">
                            <CardHeader className="border-b border-white/10 bg-gradient-to-r from-yellow-600/20 to-orange-600/20">
                                <CardTitle className="text-white flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-lg font-bold text-black">
                                        {submittedRuns.length}
                                    </span>
                                    Pending Authorization
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {runsLoading ? (
                                    <div className="p-6 space-y-3">
                                        <Skeleton className="h-12 bg-white/10" />
                                        <Skeleton className="h-12 bg-white/10" />
                                    </div>
                                ) : submittedRuns.length === 0 ? (
                                    <p className="text-slate-400 text-center py-12">No runs pending authorization</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="border-white/10 hover:bg-transparent">
                                                    <TableHead className="text-purple-300">Date</TableHead>
                                                    <TableHead className="text-purple-300">Driver</TableHead>
                                                    <TableHead className="text-purple-300">Area</TableHead>
                                                    <TableHead className="text-purple-300">Vehicle</TableHead>
                                                    <TableHead className="text-purple-300">Shops</TableHead>
                                                    <TableHead className="text-purple-300">In / Out</TableHead>
                                                    <TableHead className="text-purple-300">Remarks</TableHead>
                                                    <TableHead className="text-purple-300">Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {submittedRuns.map(run => (
                                                    <TableRow key={run.id} className="border-white/10 hover:bg-white/5">
                                                        <TableCell className="text-white font-medium">
                                                            {new Date(run.date).toLocaleDateString()}
                                                        </TableCell>
                                                        <TableCell className="text-white">{run.driverName}</TableCell>
                                                        <TableCell className="text-white">{run.area}</TableCell>
                                                        <TableCell className="text-white">{run.vehicleNo}</TableCell>
                                                        <TableCell>
                                                            <span className={`font-semibold ${(run.deliveredCount || 0) < run.assignedShopCount ? 'text-red-400' : 'text-green-400'}`}>
                                                                {run.deliveredCount || 0} / {run.assignedShopCount}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-white text-sm">
                                                            {run.checkinTime ? new Date(run.checkinTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : '-'}
                                                            {' / '}
                                                            {run.checkoutTime ? new Date(run.checkoutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-slate-300 max-w-[120px] truncate">
                                                            {run.remarks || '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => authorize.mutate(run.id)}
                                                                disabled={authorize.isPending}
                                                                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 font-semibold"
                                                            >
                                                                Authorize
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recently Authorized */}
                        <Card className="border-0 shadow-xl bg-white/5 backdrop-blur-lg">
                            <CardHeader>
                                <CardTitle className="text-white/80 text-lg">Recently Authorized ({authorizedRuns.length})</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {authorizedRuns.length === 0 ? (
                                    <p className="text-slate-500 text-center py-8">No authorized runs yet</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-white/10 hover:bg-transparent">
                                                <TableHead className="text-slate-400">Date</TableHead>
                                                <TableHead className="text-slate-400">Driver</TableHead>
                                                <TableHead className="text-slate-400">Area</TableHead>
                                                <TableHead className="text-slate-400">Shops</TableHead>
                                                <TableHead className="text-slate-400">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {authorizedRuns.slice(0, 10).map(run => (
                                                <TableRow key={run.id} className="border-white/10 hover:bg-white/5">
                                                    <TableCell className="text-slate-300">{new Date(run.date).toLocaleDateString()}</TableCell>
                                                    <TableCell className="text-slate-300">{run.driverName}</TableCell>
                                                    <TableCell className="text-slate-300">{run.area}</TableCell>
                                                    <TableCell className="text-slate-300">{run.deliveredCount}</TableCell>
                                                    <TableCell>
                                                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✓ Authorized</Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* USERS TAB */}
                    <TabsContent value="users" className="space-y-6">
                        <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-lg">
                            <CardHeader className="border-b border-white/10 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-white">Manage Users</CardTitle>
                                    <CardDescription className="text-purple-200">Add and manage staff and authorizers</CardDescription>
                                </div>
                                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="bg-purple-500 hover:bg-purple-600">+ Add User</Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-slate-900 border-white/20">
                                        <DialogHeader>
                                            <DialogTitle className="text-white">Add New User</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 pt-4">
                                            <div className="space-y-2">
                                                <Label className="text-slate-200">Name</Label>
                                                <Input
                                                    value={newUser.name}
                                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                                    placeholder="John Doe"
                                                    className="bg-white/10 border-white/20 text-white"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-200">Email</Label>
                                                <Input
                                                    type="email"
                                                    value={newUser.email}
                                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                                    placeholder="john@example.com"
                                                    className="bg-white/10 border-white/20 text-white"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-200">Role</Label>
                                                <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                                                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-800 border-white/20">
                                                        <SelectItem value="STAFF">Staff</SelectItem>
                                                        <SelectItem value="AUTHORIZER">Authorizer</SelectItem>
                                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <Button
                                                onClick={() => createUser.mutate(newUser)}
                                                disabled={createUser.isPending}
                                                className="w-full bg-purple-500 hover:bg-purple-600"
                                            >
                                                {createUser.isPending ? 'Creating...' : 'Create User'}
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent className="p-0">
                                {usersLoading ? (
                                    <div className="p-6 space-y-3">
                                        <Skeleton className="h-12 bg-white/10" />
                                        <Skeleton className="h-12 bg-white/10" />
                                    </div>
                                ) : !users || users.length === 0 ? (
                                    <p className="text-slate-400 text-center py-12">No users yet. Add one above.</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-white/10">
                                                <TableHead className="text-purple-300">Name</TableHead>
                                                <TableHead className="text-purple-300">Email</TableHead>
                                                <TableHead className="text-purple-300">Role</TableHead>
                                                <TableHead className="text-purple-300">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {users.map(u => (
                                                <TableRow key={u.id} className="border-white/10">
                                                    <TableCell className="text-white font-medium">{u.name}</TableCell>
                                                    <TableCell className="text-slate-300">{u.email || '-'}</TableCell>
                                                    <TableCell>
                                                        <Badge className={
                                                            u.role === 'ADMIN' ? 'bg-red-500/20 text-red-400' :
                                                                u.role === 'AUTHORIZER' ? 'bg-purple-500/20 text-purple-400' :
                                                                    'bg-blue-500/20 text-blue-400'
                                                        }>
                                                            {u.role}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Select
                                                            value={u.role}
                                                            onValueChange={(role) => updateUserRole.mutate({ userId: u.id, role })}
                                                        >
                                                            <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white text-sm">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-slate-800 border-white/20">
                                                                <SelectItem value="STAFF">Staff</SelectItem>
                                                                <SelectItem value="AUTHORIZER">Authorizer</SelectItem>
                                                                <SelectItem value="ADMIN">Admin</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* SETTINGS TAB */}
                    <TabsContent value="settings" className="space-y-6">
                        <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-lg">
                            <CardHeader className="border-b border-white/10">
                                <CardTitle className="text-white">Settings</CardTitle>
                                <CardDescription className="text-purple-200">Configure Google Sheets and alerts</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-purple-200">Google Sheets Web App URL</Label>
                                    <Input
                                        value={settings.sheetUrl}
                                        onChange={(e) => setSettings({ ...settings, sheetUrl: e.target.value })}
                                        placeholder="https://script.google.com/macros/s/..."
                                        className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                                    />
                                    <p className="text-slate-400 text-xs">
                                        This URL will receive data when runs are authorized
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-purple-200">Check-in Time Limit (IST)</Label>
                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={(() => {
                                                const h = parseInt(settings.checkinLimit.split(':')[0] || '9')
                                                const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
                                                return hour12.toString().padStart(2, '0')
                                            })()}
                                            onValueChange={(hour) => {
                                                const [oldHour, min] = settings.checkinLimit.split(':')
                                                const isPM = parseInt(oldHour || '9') >= 12
                                                let h = parseInt(hour)
                                                if (isPM && h !== 12) h += 12
                                                if (!isPM && h === 12) h = 0
                                                setSettings({ ...settings, checkinLimit: `${h.toString().padStart(2, '0')}:${min || '00'}` })
                                            }}
                                        >
                                            <SelectTrigger className="w-20 bg-white/10 border-white/20 text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-800 border-white/20">
                                                {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(h => (
                                                    <SelectItem key={h} value={h}>{h}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <span className="text-white">:</span>
                                        <Select
                                            value={settings.checkinLimit.split(':')[1] || '00'}
                                            onValueChange={(min) => {
                                                const [hour] = settings.checkinLimit.split(':')
                                                setSettings({ ...settings, checkinLimit: `${hour || '09'}:${min}` })
                                            }}
                                        >
                                            <SelectTrigger className="w-20 bg-white/10 border-white/20 text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-800 border-white/20">
                                                {['00', '15', '30', '45'].map(m => (
                                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={parseInt(settings.checkinLimit.split(':')[0] || '9') >= 12 ? 'PM' : 'AM'}
                                            onValueChange={(period) => {
                                                let [hour, min] = settings.checkinLimit.split(':')
                                                let h = parseInt(hour || '9')
                                                if (period === 'PM' && h < 12) h += 12
                                                if (period === 'AM' && h >= 12) h -= 12
                                                setSettings({ ...settings, checkinLimit: `${h.toString().padStart(2, '0')}:${min || '00'}` })
                                            }}
                                        >
                                            <SelectTrigger className="w-20 bg-white/10 border-white/20 text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-800 border-white/20">
                                                <SelectItem value="AM">AM</SelectItem>
                                                <SelectItem value="PM">PM</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <p className="text-slate-400 text-xs">
                                        Late check-in email alerts will be sent if staff checks in after this time (IST)
                                    </p>
                                </div>

                                <Button
                                    onClick={() => saveSettings.mutate(settings)}
                                    disabled={saveSettings.isPending}
                                    className="bg-purple-500 hover:bg-purple-600"
                                >
                                    {saveSettings.isPending ? 'Saving...' : 'Save Settings'}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
