"use client"

import { useState, useCallback, useEffect } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface SyncStatus {
  isEnabled: boolean
  deviceId: string | null
  lastSync: string | null
  pendingChanges: number
}

export function useSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isEnabled: false,
    deviceId: null,
    lastSync: null,
    pendingChanges: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize device ID
  useEffect(() => {
    let deviceId = localStorage.getItem("device-id")
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem("device-id", deviceId)
    }

    setSyncStatus((prev) => ({
      ...prev,
      deviceId,
      isEnabled: isSupabaseConfigured,
      lastSync: localStorage.getItem("last-sync"),
    }))
  }, [])

  const generateSyncCode = useCallback(async (deviceName: string) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Sync not available - database not configured")
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/sync/generate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceName }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate sync code")
      }

      const { code } = await response.json()
      return code
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate sync code"
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const useSyncCode = useCallback(
    async (code: string) => {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error("Sync not available - database not configured")
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/sync/use-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, deviceId: syncStatus.deviceId }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to use sync code")
        }

        const result = await response.json()

        // Update sync status
        setSyncStatus((prev) => ({
          ...prev,
          lastSync: new Date().toISOString(),
        }))

        localStorage.setItem("last-sync", new Date().toISOString())

        return result
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to use sync code"
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setLoading(false)
      }
    },
    [syncStatus.deviceId],
  )

  const syncData = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !syncStatus.deviceId) {
      throw new Error("Sync not available")
    }

    setLoading(true)
    setError(null)

    try {
      // Get local data
      const localData = localStorage.getItem("food-scheduler-meals")
      const meals = localData ? JSON.parse(localData) : {}

      const response = await fetch("/api/sync/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: syncStatus.deviceId,
          meals,
          lastSync: syncStatus.lastSync,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to sync data")
      }

      const { mergedMeals } = await response.json()

      // Update local storage with merged data
      localStorage.setItem("food-scheduler-meals", JSON.stringify(mergedMeals))

      // Update sync status
      const now = new Date().toISOString()
      setSyncStatus((prev) => ({
        ...prev,
        lastSync: now,
        pendingChanges: 0,
      }))

      localStorage.setItem("last-sync", now)

      return mergedMeals
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sync data"
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [syncStatus.deviceId, syncStatus.lastSync])

  const exportData = useCallback(() => {
    const localData = localStorage.getItem("food-scheduler-meals")
    const meals = localData ? JSON.parse(localData) : {}

    const exportData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      deviceId: syncStatus.deviceId,
      meals,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `food-scheduler-backup-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [syncStatus.deviceId])

  const importData = useCallback((file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          const importedData = JSON.parse(content)

          if (!importedData.meals) {
            throw new Error("Invalid backup file format")
          }

          // Merge with existing data
          const existingData = localStorage.getItem("food-scheduler-meals")
          const existingMeals = existingData ? JSON.parse(existingData) : {}

          // Simple merge - imported data takes precedence
          const mergedMeals = { ...existingMeals, ...importedData.meals }

          localStorage.setItem("food-scheduler-meals", JSON.stringify(mergedMeals))

          setSyncStatus((prev) => ({
            ...prev,
            pendingChanges: prev.pendingChanges + Object.keys(importedData.meals).length,
          }))

          resolve()
        } catch (err) {
          reject(new Error("Failed to import data: Invalid file format"))
        }
      }
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsText(file)
    })
  }, [])

  return {
    syncStatus,
    loading,
    error,
    generateSyncCode,
    useSyncCode,
    syncData,
    exportData,
    importData,
  }
}
