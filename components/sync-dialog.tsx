"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Cloud, Download, Upload, Loader2, Check, Copy, RefreshCw } from "lucide-react"
import { useSync } from "@/hooks/use-sync"

interface SyncDialogProps {
  children: React.ReactNode
  onDataImported?: () => void
}

export function SyncDialog({ children, onDataImported }: SyncDialogProps) {
  const [open, setOpen] = useState(false)
  const [deviceName, setDeviceName] = useState("")
  const [syncCode, setSyncCode] = useState("")
  const [generatedCode, setGeneratedCode] = useState("")
  const [copied, setCopied] = useState(false)
  const [fileInputKey, setFileInputKey] = useState(0)

  const { syncStatus, loading, error, generateSyncCode, useSyncCode, syncData, exportData, importData } = useSync()

  const handleGenerateCode = async () => {
    if (!deviceName.trim()) return

    try {
      const code = await generateSyncCode(deviceName.trim())
      setGeneratedCode(code)
    } catch (err) {
      console.error("Failed to generate code:", err)
    }
  }

  const handleUseSyncCode = async () => {
    const code = syncCode.trim()
    if (!code) return

    try {
      await useSyncCode(code)
      setSyncCode("")
      setOpen(false)
      if (onDataImported) onDataImported()
    } catch (err) {
      console.error("Failed to use sync code:", err)
    }
  }

  const handleSyncData = async () => {
    try {
      await syncData()
      if (onDataImported) onDataImported()
    } catch (err) {
      console.error("Failed to sync data:", err)
    }
  }

  const handleCopyCode = async () => {
    if (generatedCode) {
      await navigator.clipboard.writeText(generatedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      await importData(file)
      setFileInputKey((prev) => prev + 1) // Reset file input
      if (onDataImported) onDataImported()
    } catch (err) {
      console.error("Failed to import data:", err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Cross-Platform Sync
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sync Status */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Sync Status</span>
              <Badge variant={syncStatus.isEnabled ? "default" : "secondary"}>
                {syncStatus.isEnabled ? "Enabled" : "Local Only"}
              </Badge>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Device ID: {syncStatus.deviceId?.slice(-8) || "Unknown"}</div>
              {syncStatus.lastSync && <div>Last Sync: {new Date(syncStatus.lastSync).toLocaleString()}</div>}
              {syncStatus.pendingChanges > 0 && (
                <div className="text-orange-600">Pending Changes: {syncStatus.pendingChanges}</div>
              )}
            </div>
          </div>

          {error && (
            <Alert>
              <AlertDescription className="text-red-600">{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="sync" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sync">Sync</TabsTrigger>
              <TabsTrigger value="export">Export</TabsTrigger>
              <TabsTrigger value="import">Import</TabsTrigger>
            </TabsList>

            <TabsContent value="sync" className="space-y-4">
              {syncStatus.isEnabled ? (
                <div className="space-y-4">
                  {/* Quick Sync */}
                  <div>
                    <Button onClick={handleSyncData} disabled={loading} className="w-full">
                      {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Sync Now
                    </Button>
                  </div>

                  {/* Generate Code */}
                  <div className="space-y-2">
                    <Label htmlFor="device-name">Generate Sync Code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="device-name"
                        placeholder="Device name (e.g., iPhone, Laptop)"
                        value={deviceName}
                        onChange={(e) => setDeviceName(e.target.value)}
                      />
                      <Button onClick={handleGenerateCode} disabled={loading || !deviceName.trim()}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate"}
                      </Button>
                    </div>
                    {generatedCode && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-mono text-2xl font-bold text-blue-600">{generatedCode}</div>
                            <div className="text-xs text-blue-600">Expires in 10 minutes</div>
                          </div>
                          <Button size="sm" variant="outline" onClick={handleCopyCode}>
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Use Code */}
                  <div className="space-y-2">
                    <Label htmlFor="sync-code">Use Sync Code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="sync-code"
                        placeholder="Enter 6-digit code"
                        value={syncCode}
                        onChange={(e) => setSyncCode(e.target.value)}
                        maxLength={6}
                      />
                      <Button onClick={handleUseSyncCode} disabled={loading || syncCode.length !== 6}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sync"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    Cloud sync is not available. Set up Supabase to enable cross-platform synchronization.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="export" className="space-y-4">
              <div className="text-center space-y-4">
                <div className="text-sm text-gray-600">
                  Export your meal data as a backup file that can be imported on any device.
                </div>
                <Button onClick={exportData} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="import" className="space-y-4">
              <div className="text-center space-y-4">
                <div className="text-sm text-gray-600">
                  Import meal data from a backup file created on another device.
                </div>
                <div>
                  <input
                    key={fileInputKey}
                    type="file"
                    accept=".json"
                    onChange={handleFileImport}
                    className="hidden"
                    id="file-import"
                  />
                  <Button asChild className="w-full">
                    <label htmlFor="file-import" className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      Import Data
                    </label>
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Instructions */}
          <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800">
            <div className="font-medium mb-1">How to sync across devices:</div>
            <ol className="list-decimal list-inside space-y-1">
              <li>Generate a sync code on this device</li>
              <li>Open the app on your other device</li>
              <li>Enter the sync code to link devices</li>
              <li>Use "Sync Now" to keep data updated</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
