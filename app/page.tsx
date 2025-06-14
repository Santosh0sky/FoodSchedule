"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Trash2,
  Plus,
  Edit2,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  History,
  CalendarIcon,
  Loader2,
  Wifi,
  WifiOff,
  HardDrive,
  Cloud,
  Settings,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useMeals } from "@/hooks/use-meals"
import { SyncDialog } from "@/components/sync-dialog"

interface MealEntry {
  id: string
  date: string
  time: string
  food: string
  created_at: string
  updated_at: string
}

function formatDateKey(date: Date) {
  return date.toISOString().split("T")[0]
}

export default function FoodScheduler() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newMeal, setNewMeal] = useState({ time: "", food: "" })
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isOnline, setIsOnline] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const {
    schedules,
    loading,
    error,
    isLocalMode,
    fetchMealsForDate,
    fetchMealsForRange,
    addMeal,
    updateMeal,
    deleteMeal,
  } = useMeals()

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Load meals for selected date
  useEffect(() => {
    if (selectedDate) {
      const dateKey = formatDateKey(selectedDate)
      fetchMealsForDate(dateKey)
    }
  }, [selectedDate, fetchMealsForDate, refreshKey])

  // Load meals for current month when month changes
  useEffect(() => {
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

    fetchMealsForRange(formatDateKey(startOfMonth), formatDateKey(endOfMonth))
  }, [currentMonth, fetchMealsForRange, refreshKey])

  const handleDataImported = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const getSelectedDateKey = () => {
    return selectedDate ? formatDateKey(selectedDate) : ""
  }

  const getCurrentMeals = () => {
    const dateKey = getSelectedDateKey()
    return schedules[dateKey] || []
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return formatDateKey(date) === formatDateKey(today)
  }

  const isPastDate = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const compareDate = new Date(date)
    compareDate.setHours(0, 0, 0, 0)
    return compareDate < today
  }

  const isFutureDate = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const compareDate = new Date(date)
    compareDate.setHours(0, 0, 0, 0)
    return compareDate > today
  }

  const handleAddMeal = async () => {
    if (!newMeal.time || !newMeal.food || !selectedDate) return

    try {
      const dateKey = getSelectedDateKey()
      console.log("Adding meal for date:", dateKey, "Time:", newMeal.time, "Food:", newMeal.food)

      await addMeal(dateKey, newMeal.time, newMeal.food)
      setNewMeal({ time: "", food: "" })
      console.log("Meal added successfully")
    } catch (error) {
      console.error("Failed to add meal:", error)
      // The error is already set in the useMeals hook
    }
  }

  const handleUpdateMeal = async (id: string, time: string, food: string) => {
    try {
      console.log("Updating meal:", id, time, food)
      await updateMeal(id, time, food)
      setEditingId(null)
      console.log("Meal updated successfully")
    } catch (error) {
      console.error("Failed to update meal:", error)
      // The error is already set in the useMeals hook
    }
  }

  const handleDeleteMeal = async (id: string) => {
    try {
      console.log("Deleting meal:", id)
      await deleteMeal(id)
      console.log("Meal deleted successfully")
    } catch (error) {
      console.error("Failed to delete meal:", error)
      // The error is already set in the useMeals hook
    }
  }

  const getDayMealCount = (date: Date) => {
    const dateKey = formatDateKey(date)
    return schedules[dateKey]?.length || 0
  }

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getDateStatus = (date: Date) => {
    if (isToday(date)) return "today"
    if (isPastDate(date)) return "past"
    return "future"
  }

  const getDateStatusText = (date: Date) => {
    const status = getDateStatus(date)
    switch (status) {
      case "today":
        return "Today"
      case "past":
        return "Past"
      case "future":
        return "Future"
      default:
        return ""
    }
  }

  const getDateStatusColor = (date: Date) => {
    const status = getDateStatus(date)
    switch (status) {
      case "today":
        return "bg-blue-500"
      case "past":
        return "bg-gray-500"
      case "future":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const getPastMealsStats = () => {
    const pastDates = Object.keys(schedules).filter((dateKey) => {
      const date = new Date(dateKey)
      return isPastDate(date) && schedules[dateKey].length > 0
    })

    const totalPastMeals = pastDates.reduce((total, dateKey) => {
      return total + schedules[dateKey].length
    }, 0)

    return {
      daysWithMeals: pastDates.length,
      totalMeals: totalPastMeals,
      pastDates: pastDates.sort().reverse(),
    }
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev)
      if (direction === "prev") {
        newMonth.setMonth(prev.getMonth() - 1)
      } else {
        newMonth.setMonth(prev.getMonth() + 1)
      }
      return newMonth
    })
  }

  const pastStats = getPastMealsStats()

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="text-4xl font-bold text-gray-800">Food Scheduler</h1>
            <div className="flex items-center gap-1">
              {isOnline ? <Wifi className="w-6 h-6 text-green-500" /> : <WifiOff className="w-6 h-6 text-red-500" />}
              {isLocalMode ? (
                <HardDrive className="w-5 h-5 text-orange-500" />
              ) : (
                <Cloud className="w-5 h-5 text-blue-500" />
              )}
              <SyncDialog onDataImported={handleDataImported}>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </SyncDialog>
            </div>
          </div>
          <p className="text-gray-600">
            Plan your meals for every day of the month - {isLocalMode ? "stored locally" : "synced across all devices"}
          </p>
          <div className="flex items-center justify-center gap-4 mt-2">
            {isLocalMode && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                <HardDrive className="w-3 h-3 mr-1" />
                Local Mode
              </Badge>
            )}
            {!isOnline && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
        </div>

        {error && (
          <Alert className="mb-6 max-w-2xl mx-auto">
            <AlertDescription className="text-red-600">Error: {error}</AlertDescription>
          </Alert>
        )}

        {isLocalMode && (
          <Alert className="mb-6 max-w-2xl mx-auto">
            <AlertDescription>
              Running in local mode. Your data is saved in your browser. Click the settings icon to enable
              cross-platform sync.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Calendar Section */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span>📅</span>
                  Monthly Calendar
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[120px] text-center">
                    {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Enhanced Date Navigation */}
              <div className="flex flex-wrap items-center gap-2 mt-4">
                {/* Quick Date Shortcuts */}
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(new Date())}
                    className={isToday(selectedDate || new Date()) ? "bg-blue-100 border-blue-300" : ""}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const tomorrow = new Date()
                      tomorrow.setDate(tomorrow.getDate() + 1)
                      setSelectedDate(tomorrow)
                    }}
                  >
                    Tomorrow
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const nextWeek = new Date()
                      nextWeek.setDate(nextWeek.getDate() + 7)
                      setSelectedDate(nextWeek)
                    }}
                  >
                    Next Week
                  </Button>
                </div>

                {/* Date Picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      Pick Date
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                {/* Day Navigation */}
                {selectedDate && (
                  <div className="flex items-center gap-1 ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const prevDay = new Date(selectedDate)
                        prevDay.setDate(prevDay.getDate() - 1)
                        setSelectedDate(prevDay)
                      }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Prev Day
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const nextDay = new Date(selectedDate)
                        nextDay.setDate(nextDay.getDate() + 1)
                        setSelectedDate(nextDay)
                      }}
                    >
                      Next Day
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              {/* Quick Week Navigator */}
              <QuickDateNavigator selectedDate={selectedDate} onDateSelect={setSelectedDate} />
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                className="rounded-md border"
                components={{
                  Day: ({ date, ...props }) => {
                    const mealCount = getDayMealCount(date)
                    const status = getDateStatus(date)
                    return (
                      <div className="relative">
                        <button
                          {...props}
                          className={`${props.className} relative w-full ${
                            status === "past"
                              ? "text-gray-500"
                              : status === "today"
                                ? "font-bold text-blue-600"
                                : "text-gray-900"
                          }`}
                        >
                          {date.getDate()}
                          {mealCount > 0 && (
                            <Badge
                              variant="secondary"
                              className={`absolute -top-1 -right-1 h-5 w-5 p-0 text-xs text-white ${getDateStatusColor(date)}`}
                            >
                              {mealCount}
                            </Badge>
                          )}
                        </button>
                      </div>
                    )
                  },
                }}
              />
            </CardContent>
          </Card>

          {/* Meal Schedule Section */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>🍽️</span>
                  {selectedDate ? formatDisplayDate(selectedDate) : "Select a Date"}
                </div>
                {selectedDate && (
                  <Badge variant="outline" className={`${getDateStatusColor(selectedDate)} text-white`}>
                    {getDateStatusText(selectedDate)}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDate ? (
                <Tabs defaultValue="schedule" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="schedule" className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      Schedule
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                      <History className="w-4 h-4" />
                      History
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="schedule" className="space-y-4 mt-4">
                    {/* Add New Meal Form */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                      <h3 className="font-semibold text-gray-700">
                        {isFutureDate(selectedDate)
                          ? "Plan Meal"
                          : isToday(selectedDate)
                            ? "Add Meal"
                            : "Edit Past Meal"}
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="time">Time</Label>
                          <Input
                            id="time"
                            type="time"
                            value={newMeal.time}
                            onChange={(e) => setNewMeal((prev) => ({ ...prev, time: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="food">Food/Meal</Label>
                          <Input
                            id="food"
                            placeholder="e.g., Breakfast, Oatmeal"
                            value={newMeal.food}
                            onChange={(e) => setNewMeal((prev) => ({ ...prev, food: e.target.value }))}
                          />
                        </div>
                      </div>
                      <Button
                        onClick={handleAddMeal}
                        className="w-full"
                        disabled={!newMeal.time || !newMeal.food || loading}
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4 mr-2" />
                        )}
                        {isFutureDate(selectedDate) ? "Plan Meal" : "Add Meal"}
                      </Button>
                    </div>

                    {/* Meals List */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-700">
                        {getDateStatusText(selectedDate)}'s Schedule ({getCurrentMeals().length} meals)
                      </h3>

                      {loading && getCurrentMeals().length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                          Loading meals...
                        </div>
                      ) : getCurrentMeals().length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <span className="text-4xl mb-2 block">🍽️</span>
                          {isFutureDate(selectedDate)
                            ? "No meals planned for this day"
                            : isToday(selectedDate)
                              ? "No meals scheduled for today"
                              : "No meals recorded for this day"}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {getCurrentMeals().map((meal) => (
                            <MealEntry
                              key={meal.id}
                              meal={meal}
                              isEditing={editingId === meal.id}
                              onEdit={() => setEditingId(meal.id)}
                              onSave={(time, food) => handleUpdateMeal(meal.id, time, food)}
                              onCancel={() => setEditingId(null)}
                              onDelete={() => handleDeleteMeal(meal.id)}
                              isPast={isPastDate(selectedDate)}
                              isFuture={isFutureDate(selectedDate)}
                              loading={loading}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="space-y-4 mt-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-800 mb-2">Meal History Summary</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-blue-600">Days with meals:</span>
                          <div className="font-bold text-lg">{pastStats.daysWithMeals}</div>
                        </div>
                        <div>
                          <span className="text-blue-600">Total past meals:</span>
                          <div className="font-bold text-lg">{pastStats.totalMeals}</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-700">Recent Meal History</h3>
                      {pastStats.pastDates.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <span className="text-4xl mb-2 block">📚</span>
                          No meal history yet
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {pastStats.pastDates.slice(0, 10).map((dateKey) => {
                            const date = new Date(dateKey)
                            const meals = schedules[dateKey]
                            return (
                              <div key={dateKey} className="bg-white border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="font-medium text-gray-800">
                                    {date.toLocaleDateString("en-US", {
                                      weekday: "short",
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </div>
                                  <Badge variant="outline">{meals.length} meals</Badge>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                  {meals.slice(0, 3).map((meal, index) => (
                                    <div key={index} className="flex gap-2">
                                      <span className="text-orange-600 font-medium">{meal.time}</span>
                                      <span>{meal.food}</span>
                                    </div>
                                  ))}
                                  {meals.length > 3 && (
                                    <div className="text-xs text-gray-500">+{meals.length - 3} more meals</div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl mb-2 block">📅</span>
                  Please select a date from the calendar
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

interface MealEntryProps {
  meal: MealEntry
  isEditing: boolean
  onEdit: () => void
  onSave: (time: string, food: string) => void
  onCancel: () => void
  onDelete: () => void
  isPast: boolean
  isFuture: boolean
  loading: boolean
}

function MealEntry({ meal, isEditing, onEdit, onSave, onCancel, onDelete, isPast, isFuture, loading }: MealEntryProps) {
  const [editTime, setEditTime] = useState(meal.time)
  const [editFood, setEditFood] = useState(meal.food)

  const handleSave = () => {
    if (editTime && editFood) {
      onSave(editTime, editFood)
    }
  }

  const handleCancel = () => {
    setEditTime(meal.time)
    setEditFood(meal.food)
    onCancel()
  }

  if (isEditing) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
          <Input value={editFood} onChange={(e) => setEditFood(e.target.value)} placeholder="Food/Meal" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={!editTime || !editFood || loading}>
            {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel} disabled={loading}>
            <X className="w-3 h-3 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`border rounded-lg p-3 flex items-center justify-between hover:shadow-md transition-shadow ${
        isPast ? "bg-gray-50 border-gray-200" : isFuture ? "bg-green-50 border-green-200" : "bg-white"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`px-2 py-1 rounded text-sm font-medium ${
            isPast
              ? "bg-gray-100 text-gray-700"
              : isFuture
                ? "bg-green-100 text-green-700"
                : "bg-orange-100 text-orange-700"
          }`}
        >
          {meal.time}
        </div>
        <div className="font-medium text-gray-800">{meal.food}</div>
        {isPast && (
          <Badge variant="outline" className="text-xs">
            Past
          </Badge>
        )}
        {isFuture && (
          <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
            Planned
          </Badge>
        )}
      </div>
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={onEdit} disabled={loading}>
          <Edit2 className="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="text-red-600 hover:text-red-700"
          disabled={loading}
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
        </Button>
      </div>
    </div>
  )
}

function QuickDateNavigator({
  selectedDate,
  onDateSelect,
}: { selectedDate: Date | undefined; onDateSelect: (date: Date) => void }) {
  const getWeekDates = () => {
    const today = new Date()
    const currentDay = today.getDay()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - currentDay)

    const weekDates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      weekDates.push(date)
    }
    return weekDates
  }

  const weekDates = getWeekDates()

  return (
    <div className="bg-gray-50 p-3 rounded-lg">
      <h4 className="text-sm font-medium text-gray-700 mb-2">This Week</h4>
      <div className="grid grid-cols-7 gap-1">
        {weekDates.map((date, index) => {
          const isSelected = selectedDate && formatDateKey(date) === formatDateKey(selectedDate)
          const isToday = formatDateKey(date) === formatDateKey(new Date())

          return (
            <Button
              key={index}
              variant={isSelected ? "default" : "ghost"}
              size="sm"
              className={`h-12 flex flex-col p-1 text-xs ${isToday ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => onDateSelect(date)}
            >
              <span className="text-[10px] text-gray-500">
                {date.toLocaleDateString("en-US", { weekday: "short" })}
              </span>
              <span className="font-medium">{date.getDate()}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
