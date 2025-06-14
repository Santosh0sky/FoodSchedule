"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  ArrowUpDown,
  Search,
  Filter,
  Calendar,
  Clock,
  UtensilsCrossed,
  Download,
  Eye,
  MoreHorizontal,
  ArrowLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
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

type SortField = "date" | "time" | "food" | "created_at"
type SortDirection = "asc" | "desc"

export default function MealsTablePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "custom">("all")
  const [customDateFrom, setCustomDateFrom] = useState("")
  const [customDateTo, setCustomDateTo] = useState("")
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  const { schedules, loading, fetchMealsForRange } = useMeals()

  // Load all meals on component mount
  useEffect(() => {
    const loadAllMeals = async () => {
      const today = new Date()
      const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1)
      const threeMonthsAhead = new Date(today.getFullYear(), today.getMonth() + 3, 0)

      await fetchMealsForRange(sixMonthsAgo.toISOString().split("T")[0], threeMonthsAhead.toISOString().split("T")[0])
    }

    loadAllMeals()
  }, [fetchMealsForRange])

  // Convert schedules to flat array of meals
  const allMeals = useMemo(() => {
    const meals: MealEntry[] = []
    Object.entries(schedules).forEach(([date, dateMeals]) => {
      dateMeals.forEach((meal) => {
        meals.push(meal)
      })
    })
    return meals
  }, [schedules])

  // Filter meals based on search and date filters
  const filteredMeals = useMemo(() => {
    let filtered = allMeals

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (meal) => meal.food.toLowerCase().includes(term) || meal.date.includes(term) || meal.time.includes(term),
      )
    }

    // Date filter
    const today = new Date()
    const todayStr = today.toISOString().split("T")[0]

    switch (dateFilter) {
      case "today":
        filtered = filtered.filter((meal) => meal.date === todayStr)
        break
      case "week":
        const weekAgo = new Date(today)
        weekAgo.setDate(today.getDate() - 7)
        const weekAgoStr = weekAgo.toISOString().split("T")[0]
        filtered = filtered.filter((meal) => meal.date >= weekAgoStr && meal.date <= todayStr)
        break
      case "month":
        const monthAgo = new Date(today)
        monthAgo.setMonth(today.getMonth() - 1)
        const monthAgoStr = monthAgo.toISOString().split("T")[0]
        filtered = filtered.filter((meal) => meal.date >= monthAgoStr && meal.date <= todayStr)
        break
      case "custom":
        if (customDateFrom && customDateTo) {
          filtered = filtered.filter((meal) => meal.date >= customDateFrom && meal.date <= customDateTo)
        }
        break
    }

    return filtered
  }, [allMeals, searchTerm, dateFilter, customDateFrom, customDateTo])

  // Sort meals
  const sortedMeals = useMemo(() => {
    return [...filteredMeals].sort((a, b) => {
      let aValue: string | Date
      let bValue: string | Date

      switch (sortField) {
        case "date":
          aValue = new Date(a.date + "T" + a.time)
          bValue = new Date(b.date + "T" + b.time)
          break
        case "time":
          aValue = a.time
          bValue = b.time
          break
        case "food":
          aValue = a.food.toLowerCase()
          bValue = b.food.toLowerCase()
          break
        case "created_at":
          aValue = new Date(a.created_at)
          bValue = new Date(b.created_at)
          break
        default:
          aValue = a.date
          bValue = b.date
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
      return 0
    })
  }, [filteredMeals, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(sortedMeals.length / itemsPerPage)
  const paginatedMeals = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedMeals.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedMeals, currentPage, itemsPerPage])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
    setCurrentPage(1)
  }

  const getDateStatus = (date: string) => {
    const today = new Date().toISOString().split("T")[0]
    if (date === today) return "today"
    if (date < today) return "past"
    return "future"
  }

  const getDateStatusColor = (date: string) => {
    const status = getDateStatus(date)
    switch (status) {
      case "today":
        return "bg-blue-100 text-blue-800"
      case "past":
        return "bg-gray-100 text-gray-800"
      case "future":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":")
    const hour = Number.parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const exportToCSV = () => {
    const headers = ["Date", "Time", "Food", "Status", "Created At"]
    const csvData = [
      headers.join(","),
      ...sortedMeals.map((meal) =>
        [
          meal.date,
          meal.time,
          `"${meal.food.replace(/"/g, '""')}"`,
          getDateStatus(meal.date),
          new Date(meal.created_at).toLocaleString(),
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvData], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `meals-export-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getMealStats = () => {
    const today = new Date().toISOString().split("T")[0]
    const pastMeals = allMeals.filter((meal) => meal.date < today)
    const todayMeals = allMeals.filter((meal) => meal.date === today)
    const futureMeals = allMeals.filter((meal) => meal.date > today)

    const uniqueDates = new Set(allMeals.map((meal) => meal.date))

    return {
      total: allMeals.length,
      past: pastMeals.length,
      today: todayMeals.length,
      future: futureMeals.length,
      uniqueDays: uniqueDates.size,
    }
  }

  const stats = getMealStats()

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
                <UtensilsCrossed className="w-8 h-8" />
                All Meals
              </h1>
              <p className="text-gray-600">View and manage all your meals in table format</p>
            </div>
          </div>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Meals</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.past}</div>
              <div className="text-sm text-gray-600">Past Meals</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.today}</div>
              <div className="text-sm text-gray-600">Today</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.future}</div>
              <div className="text-sm text-gray-600">Planned</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.uniqueDays}</div>
              <div className="text-sm text-gray-600">Days</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search Meals</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="search"
                    placeholder="Search food, date, time..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Date Filter */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range */}
              {dateFilter === "custom" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="date-from">From Date</Label>
                    <Input
                      id="date-from"
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date-to">To Date</Label>
                    <Input
                      id="date-to"
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Items per page */}
              <div className="space-y-2">
                <Label>Items per page</Label>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => setItemsPerPage(Number.parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filter Summary */}
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <span>
                Showing {paginatedMeals.length} of {filteredMeals.length} meals
              </span>
              {searchTerm && <Badge variant="outline">Search: "{searchTerm}"</Badge>}
              {dateFilter !== "all" && (
                <Badge variant="outline">
                  {dateFilter === "custom" ? `${customDateFrom} to ${customDateTo}` : dateFilter}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Meals Table</span>
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && allMeals.length === 0 ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Loading meals...</p>
              </div>
            ) : paginatedMeals.length === 0 ? (
              <div className="text-center py-12">
                <UtensilsCrossed className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">No meals found matching your criteria</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("date")}
                            className="h-auto p-0 font-semibold"
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            Date
                            <ArrowUpDown className="w-4 h-4 ml-2" />
                          </Button>
                        </TableHead>
                        <TableHead className="w-[100px]">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("time")}
                            className="h-auto p-0 font-semibold"
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            Time
                            <ArrowUpDown className="w-4 h-4 ml-2" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("food")}
                            className="h-auto p-0 font-semibold"
                          >
                            <UtensilsCrossed className="w-4 h-4 mr-2" />
                            Food
                            <ArrowUpDown className="w-4 h-4 ml-2" />
                          </Button>
                        </TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead className="w-[140px]">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort("created_at")}
                            className="h-auto p-0 font-semibold"
                          >
                            Created
                            <ArrowUpDown className="w-4 h-4 ml-2" />
                          </Button>
                        </TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMeals.map((meal) => (
                        <TableRow key={meal.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{formatDate(meal.date)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {formatTime(meal.time)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            <div className="truncate" title={meal.food}>
                              {meal.food}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getDateStatusColor(meal.date)}>{getDateStatus(meal.date)}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(meal.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/?date=${meal.date}`}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    View in Calendar
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-8 h-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
