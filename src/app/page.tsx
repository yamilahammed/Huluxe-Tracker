'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@clerk/nextjs'
import { Navigation } from '@/components/layout/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface Vehicle {
  id: string
  name: string
  number: string
  available: boolean
  usedByCurrentUser: boolean
}

export default function StaffPage() {
  const { user, isLoaded } = useUser()
  const queryClient = useQueryClient()
  const [mounted, setMounted] = useState(false)
  const [showNewEntryForm, setShowNewEntryForm] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Role-based redirect: AUTHORIZER/ADMIN go to /authorizer
    if (isLoaded && user) {
      const role = (user.publicMetadata?.role as string) || 'STAFF'
      if (role === 'AUTHORIZER' || role === 'ADMIN') {
        window.location.href = '/authorizer'
      }
    }
  }, [isLoaded, user])

  const [formData, setFormData] = useState({
    vehicleNo: '',
    area: '',
    plg: '',
    assignedShopCount: '',
    driverName: '',
    deliveryPersonName: '',
  })

  const [eveningData, setEveningData] = useState({
    deliveredCount: '',
    remarks: '',
  })

  // Fetch today's run
  const { data: todayRun } = useQuery({
    queryKey: ['todayRun'],
    queryFn: async () => {
      const res = await fetch('/api/runs/today')
      if (!res.ok) return null
      return res.json()
    },
    enabled: mounted,
  })

  // Fetch available vehicles
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await fetch('/api/vehicles')
      if (!res.ok) return { vehicles: [] }
      return res.json()
    },
    enabled: mounted,
  })

  const vehicles: Vehicle[] = vehiclesData?.vehicles || []

  // Create run
  const createRun = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          assignedShopCount: parseInt(data.assignedShopCount) || 0,
        }),
      })
      if (!res.ok) throw new Error('Failed to create')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['todayRun'], data)
      setShowNewEntryForm(false)
      setFormData({ vehicleNo: '', area: '', plg: '', assignedShopCount: '', driverName: '', deliveryPersonName: '' })
      toast.success('Run created!')
    },
    onError: () => toast.error('Failed to create run'),
  })

  // Check in
  const checkIn = useMutation({
    mutationFn: async (runId: string) => {
      const res = await fetch(`/api/runs/${runId}/checkin`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['todayRun'], data)
      toast.success('✓ Checked in!')
    },
    onError: () => toast.error('Check-in failed'),
  })

  // Check out
  const checkOut = useMutation({
    mutationFn: async (runId: string) => {
      const res = await fetch(`/api/runs/${runId}/checkout`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['todayRun'], data)
      toast.success('✓ Checked out!')
    },
    onError: () => toast.error('Check-out failed'),
  })

  // Submit evening
  const submitEvening = useMutation({
    mutationFn: async ({ runId, data }: { runId: string; data: typeof eveningData }) => {
      const res = await fetch(`/api/runs/${runId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveredCount: parseInt(data.deliveredCount) || 0,
          remarks: data.remarks,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['todayRun'], data)
      toast.success('Report submitted!')
    },
    onError: () => toast.error('Submit failed'),
  })

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  })
  const timeStr = today.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 pb-20">
      <Navigation />
      <div className="max-w-lg mx-auto space-y-6 pt-16">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-4xl font-bold text-white tracking-tight">HULUXE</h1>
          <p className="text-blue-300 text-sm mt-1">Staff Portal</p>
          <div className="mt-4 bg-white/5 rounded-xl p-4">
            <p className="text-white text-lg font-medium">{dateStr}</p>
            <p className="text-blue-300 text-2xl font-bold">{timeStr}</p>
          </div>
          {user && <p className="text-blue-200 text-sm mt-3">Welcome, {user.fullName}</p>}
        </div>

        {/* Phase 1: Morning Plan - Show if no run exists OR if creating new entry */}
        {(!todayRun || showNewEntryForm) && (
          <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-lg overflow-hidden">
            <CardHeader className="border-b border-white/10 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-lg font-bold text-white">1</span>
                <div>
                  <CardTitle className="text-white text-xl">Morning Delivery Plan</CardTitle>
                  <CardDescription className="text-blue-200">Fill in today&apos;s delivery details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label className="text-blue-200">Select Vehicle</Label>
                  <Select
                    value={formData.vehicleNo}
                    onValueChange={(value) => setFormData({ ...formData, vehicleNo: value })}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white h-12">
                      <SelectValue placeholder="Choose a vehicle..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-white/20">
                      {vehicles.map((v) => (
                        <SelectItem
                          key={v.id}
                          value={v.number}
                          disabled={!v.available}
                          className={!v.available ? 'opacity-50' : ''}
                        >
                          {v.name} - {v.number} {!v.available && '(In Use)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-blue-200">Area</Label>
                  <Input
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="Koramangala"
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 h-12"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-blue-200">PLG</Label>
                  <Input
                    value={formData.plg}
                    onChange={(e) => setFormData({ ...formData, plg: e.target.value })}
                    placeholder="PLG-001"
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-blue-200">Total Shops</Label>
                  <Input
                    type="number"
                    value={formData.assignedShopCount}
                    onChange={(e) => setFormData({ ...formData, assignedShopCount: e.target.value })}
                    placeholder="50"
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 h-12"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-blue-200">Driver Name</Label>
                  <Input
                    value={formData.driverName}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                    placeholder="John Doe"
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-blue-200">Delivery Person</Label>
                  <Input
                    value={formData.deliveryPersonName}
                    onChange={(e) => setFormData({ ...formData, deliveryPersonName: e.target.value })}
                    placeholder="Your name"
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 h-12"
                  />
                </div>
              </div>

              <Button
                onClick={() => createRun.mutate(formData)}
                disabled={createRun.isPending}
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25"
              >
                {createRun.isPending ? 'Creating...' : 'Start Delivery Run'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Run exists - Show run info and controls */}
        {todayRun && !showNewEntryForm && (
          <>
            {/* New Entry Button */}
            <Button
              onClick={() => setShowNewEntryForm(true)}
              variant="outline"
              className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
            >
              + New Entry
            </Button>

            {/* Run Summary Card */}
            <Card className="border-0 shadow-xl bg-white/10 backdrop-blur-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg">Today&apos;s Run Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white/5 p-3 rounded-lg">
                    <p className="text-slate-400 text-xs">Vehicle</p>
                    <p className="text-white font-semibold">{todayRun.vehicleNo}</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg">
                    <p className="text-slate-400 text-xs">Area</p>
                    <p className="text-white font-semibold">{todayRun.area}</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg">
                    <p className="text-slate-400 text-xs">PLG</p>
                    <p className="text-white font-semibold">{todayRun.plg}</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg">
                    <p className="text-slate-400 text-xs">Assigned Shops</p>
                    <p className="text-white font-semibold">{todayRun.assignedShopCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Morning Check-In */}
            <Card className={`border-0 shadow-xl backdrop-blur-lg ${todayRun.checkinTime ? 'bg-green-500/20' : 'bg-white/10'}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-sm font-bold">☀</span>
                  Morning Check-In
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center py-4">
                {todayRun.checkinTime ? (
                  <div>
                    <div className="text-green-400 text-5xl mb-2">✓</div>
                    <p className="text-green-300 text-sm font-medium">Checked In</p>
                    <p className="text-white text-3xl font-bold mt-1">
                      {new Date(todayRun.checkinTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                    </p>
                  </div>
                ) : (
                  <Button
                    onClick={() => checkIn.mutate(todayRun.id)}
                    disabled={checkIn.isPending}
                    className="w-full h-20 text-2xl font-bold bg-gradient-to-br from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 shadow-lg"
                  >
                    {checkIn.isPending ? '...' : 'CHECK IN NOW'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Evening Check-Out */}
            <Card className={`border-0 shadow-xl backdrop-blur-lg ${todayRun.checkoutTime ? 'bg-orange-500/20' : 'bg-white/10'}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold">🌙</span>
                  Evening Check-Out
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center py-4">
                {todayRun.checkoutTime ? (
                  <div>
                    <div className="text-orange-400 text-5xl mb-2">✓</div>
                    <p className="text-orange-300 text-sm font-medium">Checked Out</p>
                    <p className="text-white text-3xl font-bold mt-1">
                      {new Date(todayRun.checkoutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                    </p>
                  </div>
                ) : (
                  <Button
                    onClick={() => checkOut.mutate(todayRun.id)}
                    disabled={!todayRun.checkinTime || checkOut.isPending}
                    className="w-full h-20 text-2xl font-bold bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-lg disabled:opacity-50"
                  >
                    {!todayRun.checkinTime ? 'Check In First' : checkOut.isPending ? '...' : 'CHECK OUT NOW'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Evening Report - Show after checkout */}
            {todayRun.checkoutTime && todayRun.status !== 'SUBMITTED' && todayRun.status !== 'AUTHORIZED' && (
              <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-lg overflow-hidden">
                <CardHeader className="border-b border-white/10 bg-gradient-to-r from-purple-600/20 to-pink-600/20">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-lg font-bold text-white">📝</span>
                    <div>
                      <CardTitle className="text-white text-xl">Evening Closing Report</CardTitle>
                      <CardDescription className="text-purple-200">Submit your delivery summary</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-purple-200">Total Shops Delivered</Label>
                    <Input
                      type="number"
                      value={eveningData.deliveredCount}
                      onChange={(e) => setEveningData({ ...eveningData, deliveredCount: e.target.value })}
                      placeholder={`Out of ${todayRun.assignedShopCount} assigned`}
                      className="bg-white/10 border-white/20 text-white text-xl h-14 placeholder:text-slate-400"
                    />
                    <p className="text-slate-400 text-xs">Assigned: {todayRun.assignedShopCount} shops</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-purple-200">Remarks / Issues</Label>
                    <Textarea
                      value={eveningData.remarks}
                      onChange={(e) => setEveningData({ ...eveningData, remarks: e.target.value })}
                      placeholder="Any delivery issues, returns, or notes..."
                      className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 min-h-[100px]"
                    />
                  </div>
                  <Button
                    onClick={() => submitEvening.mutate({ runId: todayRun.id, data: eveningData })}
                    disabled={submitEvening.isPending}
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-lg shadow-purple-500/25"
                  >
                    {submitEvening.isPending ? 'Submitting...' : 'Submit for Authorization'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Status: Submitted */}
            {todayRun.status === 'SUBMITTED' && (
              <Card className="border-0 bg-yellow-500/20 backdrop-blur-lg">
                <CardContent className="p-6 text-center">
                  <div className="text-5xl mb-3">⏳</div>
                  <p className="text-yellow-300 font-semibold text-lg">Waiting for Authorization</p>
                  <p className="text-yellow-200/70 text-sm mt-1">
                    Delivered: {todayRun.deliveredCount} / {todayRun.assignedShopCount} shops
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Status: Authorized */}
            {todayRun.status === 'AUTHORIZED' && (
              <Card className="border-0 bg-green-500/20 backdrop-blur-lg">
                <CardContent className="p-6 text-center">
                  <div className="text-5xl mb-3">✅</div>
                  <p className="text-green-300 font-semibold text-lg">Run Authorized!</p>
                  <p className="text-green-200/70 text-sm mt-1">Your run has been approved and synced.</p>
                </CardContent>
              </Card>
            )}

            {/* Timeline Summary */}
            <Card className="border-0 shadow-xl bg-white/5 backdrop-blur-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-white/70 text-sm">Today&apos;s Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-center">
                  <div>
                    <p className="text-slate-400 text-xs">Check In</p>
                    <p className="text-white font-medium">
                      {todayRun.checkinTime
                        ? new Date(todayRun.checkinTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
                        : '--:--'}
                    </p>
                  </div>
                  <div className="text-slate-500">→</div>
                  <div>
                    <p className="text-slate-400 text-xs">Check Out</p>
                    <p className="text-white font-medium">
                      {todayRun.checkoutTime
                        ? new Date(todayRun.checkoutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
                        : '--:--'}
                    </p>
                  </div>
                  <div className="text-slate-500">→</div>
                  <div>
                    <p className="text-slate-400 text-xs">Delivered</p>
                    <p className="text-white font-medium">{todayRun.deliveredCount ?? '--'}</p>
                  </div>
                  <div className="text-slate-500">→</div>
                  <div>
                    <p className="text-slate-400 text-xs">Status</p>
                    <p className={`font-medium ${todayRun.status === 'AUTHORIZED' ? 'text-green-400' :
                      todayRun.status === 'SUBMITTED' ? 'text-yellow-400' :
                        'text-blue-400'
                      }`}>
                      {todayRun.status}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
