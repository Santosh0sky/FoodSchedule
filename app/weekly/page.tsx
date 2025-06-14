"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Calendar,
  Coffee,
  UtensilsCrossed,
  Cookie,
  Moon,
  Loader2,
} from "lucide-react"
import { useMeals } from "@/hooks/use-meals"
import Link from "next/link"

interface MealEntry {
  id: string
  date: string
  time: string
  food: string
  created_at: string
  updated_at: string
}

type MealType = "breakfast" | "lunch" | "snacks" | "dinner"

const MEAL_TYPES: { type: MealType; label: string; icon: any; timeRange: string; color: string }[] = [
  {
    type: "breakfast",
    label: "Breakfast",
    icon: Coffee,
    timeRange: "06:00-10:00",
    color: "bg-orange-100 text-orange-800",
  },
  {
    type: "lunch",
    label: "Lunch",
    icon: UtensilsCrossed,
    timeRange: "11:00-15:00",
    color: "bg-blue-100 text-blue-800",
  },
  { type: "snacks", label: "Snacks", icon: Cookie, timeRange: "15:00-18:00", color: "bg-green-100 text-green-800" },
  { type: "dinner", label: "Dinner", icon: Moon, timeRange: "18:00-22:00", color: "bg-purple-100 text-purple-800" },
]

const DAYS_OF_WEEK = [
  { short: "Mon", full: "Monday" },
  { short: "Tue", full: "Tuesday" },
  { short: "Wed", full: "Wednesday" },
  { short: "Thu", full: "Thursday" },
  { short: "Fri", full: "Friday" },
  { short: "Sat", full: "Saturday" },
  { short: "Sun", full: "Sunday" },
]

export default function WeeklyPlannerPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [editingMeal, setEditingMeal] = useState<{ date: string; type: MealType; meal?: MealEntry } | null>(null)
  const [newMealData, setNewMealData] = useState({ food: "", time: "", notes: "" })
  const [dialogOpen, setDialogOpen] = useState(false)

  const { schedules, loading, fetchMealsForRange, addMeal, updateMeal, deleteMeal } = useMeals()

  // Get start and end of current week
  const getWeekRange = (date: Date) => {
    const startOfWeek = new Date(date)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Monday start
    startOfWeek.setDate(diff)
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    return { start: startOfWeek, end: endOfWeek }
  }

  const { start: weekStart, end: weekEnd } = getWeekRange(currentWeek)

  // Load meals for current week
  useEffect(() => {
    const startStr = weekStart.toISOString().split("T")[0]
    const endStr = weekEnd.toISOString().split("T")[0]
    fetchMealsForRange(startStr, endStr)
  }, [weekStart, weekEnd, fetchMealsForRange])

  // Generate week dates
  const weekDates = useMemo(() => {
    const dates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + i)
      dates.push(date)
    }
    return dates
  }, [weekStart])

  // Categorize meals by type based on time
  const categorizeMealByTime = (time: string): MealType => {
    const hour = Number.parseInt(time.split(":")[0])
    if (hour >= 6 && hour < 11) return "breakfast"
    if (hour >= 11 && hour < 15) return "lunch"
    if (hour >= 15 && hour < 18) return "snacks"
    return "dinner"
  }

  // Get meals for a specific date and meal type
  const getMealsForDateAndType = (date: Date, mealType: MealType): MealEntry[] => {
    const dateKey = date.toISOString().split("T")[0]
    const dayMeals = schedules[dateKey] || []
    return dayMeals.filter((meal) => categorizeMealByTime(meal.time) === mealType)
  }

  // Get default time for meal type
  const getDefaultTimeForMealType = (mealType: MealType): string => {
    switch (mealType) {
      case "breakfast":
        return "08:00"
      case "lunch":
        return "12:30"
      case "snacks":
        return "16:00"
      case "dinner":
        return "19:00"
      default:
        return "12:00"
    }
  }

  // Navigate weeks
  const navigateWeek = (direction: "prev" | "next") => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(currentWeek.getDate() + (direction === "next" ? 7 : -7))
    setCurrentWeek(newWeek)
  }

  // Handle add/edit meal
  const handleSaveMeal = async () => {
    if (!editingMeal || !newMealData.food.trim()) return

    try {
      const dateKey = editingMeal.date
      const time = newMealData.time || getDefaultTimeForMealType(editingMeal.type)
      const food = newMealData.food.trim()

      if (editingMeal.meal) {
        // Update existing meal
        await updateMeal(editingMeal.meal.id, time, food)
      } else {
        // Add new meal
        await addMeal(dateKey, time, food)
      }

      setDialogOpen(false)
      setEditingMeal(null)
      setNewMealData({ food: "", time: "", notes: "" })
    } catch (error) {
      console.error("Failed to save meal:", error)
    }
  }

  // Handle delete meal
  const handleDeleteMeal = async (meal: MealEntry) => {
    try {
      await deleteMeal(meal.id)
    } catch (error) {
      console.error("Failed to delete meal:", error)
    }
  }

  // Open add/edit dialog
  const openMealDialog = (date: Date, mealType: MealType, meal?: MealEntry) => {
    const dateKey = date.toISOString().split("T")[0]
    setEditingMeal({ date: dateKey, type: mealType, meal })
    setNewMealData({
      food: meal?.food || "",
      time: meal?.time || getDefaultTimeForMealType(mealType),
      notes: "",
    })
    setDialogOpen(true)
  }

  // Copy meal to another day
  const copyMealToDay = async (meal: MealEntry, targetDate: Date) => {
    try {
      const dateKey = targetDate.toISOString().split("T")[0]
      await addMeal(dateKey, meal.time, meal.food)
    } catch (error) {
      console.error("Failed to copy meal:", error)
    }
  }

  // Get week summary stats
  const getWeekStats = () => {
    let totalMeals = 0
    const mealsByType = { breakfast: 0, lunch: 0, snacks: 0, dinner: 0 }

    weekDates.forEach((date) => {
      MEAL_TYPES.forEach(({ type }) => {
        const meals = getMealsForDateAndType(date, type)
        totalMeals += meals.length
        mealsByType[type] += meals.length
      })
    })

    return { totalMeals, mealsByType }
  }

  const stats = getWeekStats()

  const formatWeekRange = () => {
    const start = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    const end = weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    return `${start} - ${end}`
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isPastDate = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const compareDate = new Date(date)
    compareDate.setHours(0, 0, 0, 0)
    return compareDate < today
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Calendar
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="w-8 h-8" />
                Weekly Meal Planner
              </h1>
              <p className="text-gray-600">Plan your meals for the entire week</p>
            </div>
          </div>
        </div>

        {/* Week Navigation */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => navigateWeek("prev")}>
                  <ChevronLeft className="w-4 h-4" />
                  Previous Week
                </Button>
                <div className="text-center">
                  <h2 className="text-xl font-semibold">{formatWeekRange()}</h2>
                  <p className="text-sm text-gray-600">Week of {weekStart.toLocaleDateString()}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigateWeek("next")}>
                  Next Week
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            </div>
          </CardHeader>
        </Card>

        {/* Week Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalMeals}</div>
              <div className="text-sm text-gray-600">Total Meals</div>
            </CardContent>
          </Card>
          {MEAL_TYPES.map(({ type, label, icon: Icon, color }) => (
            <Card key={type}>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Icon className="w-5 h-5 mr-1" />
                  <div className="text-lg font-bold">{stats.mealsByType[type]}</div>
                </div>
                <div className="text-sm text-gray-600">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Weekly Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {weekDates.map((date, dayIndex) => (
            <Card key={date.toISOString()} className={`${isToday(date) ? "ring-2 ring-blue-500" : ""}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-medium text-gray-600">{DAYS_OF_WEEK[dayIndex].short}</span>
                    <span className={`text-lg font-bold ${isToday(date) ? "text-blue-600" : ""}`}>
                      {date.getDate()}
                    </span>
                    {isToday(date) && <Badge className="text-xs mt-1">Today</Badge>}
                    {isPastDate(date) && (
                      <Badge variant="outline" className="text-xs mt-1">
                        Past
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {MEAL_TYPES.map(({ type, label, icon: Icon, color }) => {
                  const meals = getMealsForDateAndType(date, type)
                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{label}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openMealDialog(date, type)}
                          className="h-6 w-6 p-0"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {meals.length === 0 ? (
                          <div
                            className="text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded p-2 text-center cursor-pointer hover:border-gray-300"
                            onClick={() => openMealDialog(date, type)}
                          >
                            Click to add {label.toLowerCase()}
                          </div>
                        ) : (
                          meals.map((meal) => (
                            <div key={meal.id} className="group relative">
                              <div className={`text-xs p-2 rounded ${color} cursor-pointer`}>
                                <div className="font-medium truncate" title={meal.food}>
                                  {meal.food}
                                </div>
                                <div className="text-xs opacity-75">{meal.time}</div>
                              </div>
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openMealDialog(date, type, meal)}
                                  className="h-5 w-5 p-0 bg-white/80 hover:bg-white"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteMeal(meal)}
                                  className="h-5 w-5 p-0 bg-white/80 hover:bg-white text-red-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add/Edit Meal Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingMeal?.meal ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {editingMeal?.meal ? "Edit" : "Add"} {editingMeal?.type}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="meal-food">Food/Meal</Label>
                <Textarea
                  id="meal-food"
                  placeholder={`Enter your ${editingMeal?.type} details...`}
                  value={newMealData.food}
                  onChange={(e) => setNewMealData((prev) => ({ ...prev, food: e.target.value }))}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="meal-time">Time</Label>
                <Input
                  id="meal-time"
                  type="time"
                  value={newMealData.time}
                  onChange={(e) => setNewMealData((prev) => ({ ...prev, time: e.target.value }))}
                />
              </div>
              {editingMeal?.type && (
                <div className="text-xs text-gray-500">
                  Suggested time range: {MEAL_TYPES.find((t) => t.type === editingMeal.type)?.timeRange}
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveMeal} disabled={!newMealData.food.trim() || loading} className="flex-1">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {editingMeal?.meal ? "Update" : "Add"} Meal
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
