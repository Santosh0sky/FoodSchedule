"use client"

import { useState, useCallback, useEffect } from "react"
import { isSupabaseConfigured } from "@/lib/supabase"

interface MealEntry {
  id: string
  date: string
  time: string
  food: string
  created_at: string
  updated_at: string
}

interface DaySchedule {
  [key: string]: MealEntry[]
}

const STORAGE_KEY = "food-scheduler-meals"

export function useMeals() {
  const [schedules, setSchedules] = useState<DaySchedule>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLocalMode, setIsLocalMode] = useState(!isSupabaseConfigured)

  // Load from localStorage on mount
  useEffect(() => {
    if (isLocalMode) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsedData = JSON.parse(stored)
          setSchedules(parsedData)
        }
      } catch (err) {
        console.error("Error loading from localStorage:", err)
      }
    }
  }, [isLocalMode])

  // Save to localStorage whenever schedules change in local mode
  useEffect(() => {
    if (isLocalMode && Object.keys(schedules).length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules))
      } catch (err) {
        console.error("Error saving to localStorage:", err)
      }
    }
  }, [schedules, isLocalMode])

  const fetchMealsForDate = useCallback(
    async (date: string) => {
      setLoading(true)
      setError(null)

      try {
        if (isLocalMode) {
          // In local mode, data is already loaded from localStorage
          setLoading(false)
          return
        }

        console.log("Fetching meals for date:", date)
        const response = await fetch(`/api/meals?date=${date}`)

        let responseData
        const contentType = response.headers.get("content-type")

        if (contentType && contentType.includes("application/json")) {
          responseData = await response.json()
        } else {
          const textResponse = await response.text()
          console.error("Non-JSON response:", textResponse)
          throw new Error(`Server returned non-JSON response: ${response.status}`)
        }

        if (!response.ok) {
          throw new Error(responseData.error || `HTTP ${response.status}`)
        }

        console.log("Fetched meals:", responseData)

        setSchedules((prev) => ({
          ...prev,
          [date]: Array.isArray(responseData) ? responseData : [],
        }))
      } catch (err) {
        console.error("Error fetching meals:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch meals")
        // Switch to local mode if API fails
        if (!isLocalMode) {
          setIsLocalMode(true)
          console.log("Switched to local mode due to API error")
        }
      } finally {
        setLoading(false)
      }
    },
    [isLocalMode],
  )

  const fetchMealsForRange = useCallback(
    async (startDate: string, endDate: string) => {
      setLoading(true)
      setError(null)

      try {
        if (isLocalMode) {
          // In local mode, data is already loaded from localStorage
          setLoading(false)
          return
        }

        console.log("Fetching meals for range:", startDate, "to", endDate)
        const response = await fetch(`/api/meals?startDate=${startDate}&endDate=${endDate}`)

        let responseData
        const contentType = response.headers.get("content-type")

        if (contentType && contentType.includes("application/json")) {
          responseData = await response.json()
        } else {
          const textResponse = await response.text()
          console.error("Non-JSON response:", textResponse)
          throw new Error(`Server returned non-JSON response: ${response.status}`)
        }

        if (!response.ok) {
          throw new Error(responseData.error || `HTTP ${response.status}`)
        }

        console.log("Fetched meals for range:", responseData)

        // Group meals by date
        const groupedMeals: DaySchedule = {}
        if (Array.isArray(responseData)) {
          responseData.forEach((meal: MealEntry) => {
            if (!groupedMeals[meal.date]) {
              groupedMeals[meal.date] = []
            }
            groupedMeals[meal.date].push(meal)
          })
        }

        setSchedules((prev) => ({
          ...prev,
          ...groupedMeals,
        }))
      } catch (err) {
        console.error("Error fetching meals range:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch meals")
        // Switch to local mode if API fails
        if (!isLocalMode) {
          setIsLocalMode(true)
          console.log("Switched to local mode due to API error")
        }
      } finally {
        setLoading(false)
      }
    },
    [isLocalMode],
  )

  const addMeal = useCallback(
    async (date: string, time: string, food: string) => {
      setLoading(true)
      setError(null)

      try {
        console.log("Adding meal:", { date, time, food })

        if (isLocalMode) {
          // Local mode - create meal locally
          const newMeal: MealEntry = {
            id: Date.now().toString(),
            date,
            time,
            food,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          setSchedules((prev) => ({
            ...prev,
            [date]: [...(prev[date] || []), newMeal].sort((a, b) => a.time.localeCompare(b.time)),
          }))

          return newMeal
        }

        const response = await fetch("/api/meals", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ date, time, food }),
        })

        let responseData
        const contentType = response.headers.get("content-type")

        if (contentType && contentType.includes("application/json")) {
          responseData = await response.json()
        } else {
          const textResponse = await response.text()
          console.error("Non-JSON response:", textResponse)
          throw new Error(`Server returned non-JSON response: ${response.status}`)
        }

        console.log("Add meal response:", responseData)

        if (!response.ok) {
          throw new Error(responseData.error || `HTTP ${response.status}`)
        }

        const newMeal = responseData

        setSchedules((prev) => ({
          ...prev,
          [date]: [...(prev[date] || []), newMeal].sort((a, b) => a.time.localeCompare(b.time)),
        }))

        return newMeal
      } catch (err) {
        console.error("Error adding meal:", err)
        const errorMessage = err instanceof Error ? err.message : "Failed to add meal"
        setError(errorMessage)

        // Switch to local mode and retry if API fails
        if (!isLocalMode) {
          setIsLocalMode(true)
          console.log("Switched to local mode, retrying add meal")
          return addMeal(date, time, food)
        }

        throw new Error(errorMessage)
      } finally {
        setLoading(false)
      }
    },
    [isLocalMode],
  )

  const updateMeal = useCallback(
    async (id: string, time: string, food: string) => {
      setLoading(true)
      setError(null)

      try {
        console.log("Updating meal:", { id, time, food })

        if (isLocalMode) {
          // Local mode - update meal locally
          setSchedules((prev) => {
            const newSchedules = { ...prev }
            Object.keys(newSchedules).forEach((date) => {
              newSchedules[date] = newSchedules[date]
                .map((meal) => (meal.id === id ? { ...meal, time, food, updated_at: new Date().toISOString() } : meal))
                .sort((a, b) => a.time.localeCompare(b.time))
            })
            return newSchedules
          })
          return
        }

        const response = await fetch(`/api/meals/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ time, food }),
        })

        const responseData = await response.json()

        if (!response.ok) {
          throw new Error(responseData.error || `HTTP ${response.status}`)
        }

        const updatedMeal = responseData

        setSchedules((prev) => {
          const newSchedules = { ...prev }
          Object.keys(newSchedules).forEach((date) => {
            newSchedules[date] = newSchedules[date]
              .map((meal) => (meal.id === id ? updatedMeal : meal))
              .sort((a, b) => a.time.localeCompare(b.time))
          })
          return newSchedules
        })

        return updatedMeal
      } catch (err) {
        console.error("Error updating meal:", err)
        const errorMessage = err instanceof Error ? err.message : "Failed to update meal"
        setError(errorMessage)

        // Switch to local mode and retry if API fails
        if (!isLocalMode) {
          setIsLocalMode(true)
          console.log("Switched to local mode, retrying update meal")
          return updateMeal(id, time, food)
        }

        throw new Error(errorMessage)
      } finally {
        setLoading(false)
      }
    },
    [isLocalMode],
  )

  const deleteMeal = useCallback(
    async (id: string) => {
      setLoading(true)
      setError(null)

      try {
        console.log("Deleting meal:", id)

        if (isLocalMode) {
          // Local mode - delete meal locally
          setSchedules((prev) => {
            const newSchedules = { ...prev }
            Object.keys(newSchedules).forEach((date) => {
              newSchedules[date] = newSchedules[date].filter((meal) => meal.id !== id)
            })
            return newSchedules
          })
          return
        }

        const response = await fetch(`/api/meals/${id}`, {
          method: "DELETE",
        })

        const responseData = await response.json()

        if (!response.ok) {
          throw new Error(responseData.error || `HTTP ${response.status}`)
        }

        setSchedules((prev) => {
          const newSchedules = { ...prev }
          Object.keys(newSchedules).forEach((date) => {
            newSchedules[date] = newSchedules[date].filter((meal) => meal.id !== id)
          })
          return newSchedules
        })
      } catch (err) {
        console.error("Error deleting meal:", err)
        const errorMessage = err instanceof Error ? err.message : "Failed to delete meal"
        setError(errorMessage)

        // Switch to local mode and retry if API fails
        if (!isLocalMode) {
          setIsLocalMode(true)
          console.log("Switched to local mode, retrying delete meal")
          return deleteMeal(id)
        }

        throw new Error(errorMessage)
      } finally {
        setLoading(false)
      }
    },
    [isLocalMode],
  )

  return {
    schedules,
    loading,
    error,
    isLocalMode,
    fetchMealsForDate,
    fetchMealsForRange,
    addMeal,
    updateMeal,
    deleteMeal,
  }
}
