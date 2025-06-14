import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Sync not available - database not configured" }, { status: 500 })
    }

    const { deviceId, meals, lastSync } = await request.json()

    if (!deviceId) {
      return NextResponse.json({ error: "Device ID is required" }, { status: 400 })
    }

    // Get existing meals from database for this device
    const { data: existingMeals, error: fetchError } = await supabase
      .from("meals")
      .select("*")
      .eq("device_id", deviceId)

    if (fetchError) {
      console.error("Error fetching existing meals:", fetchError)
      return NextResponse.json({ error: "Failed to fetch existing meals" }, { status: 500 })
    }

    // Convert local meals to database format
    const localMealsArray = []
    for (const [date, dateMeals] of Object.entries(meals as Record<string, any[]>)) {
      for (const meal of dateMeals) {
        localMealsArray.push({
          ...meal,
          device_id: deviceId,
          synced_at: new Date().toISOString(),
        })
      }
    }

    // Merge logic: local meals take precedence for conflicts
    const existingMealsMap = new Map(existingMeals?.map((meal) => [meal.id, meal]) || [])
    const mealsToUpsert = []

    for (const localMeal of localMealsArray) {
      const existing = existingMealsMap.get(localMeal.id)
      if (!existing || new Date(localMeal.updated_at) > new Date(existing.updated_at)) {
        mealsToUpsert.push(localMeal)
      }
    }

    // Upsert meals to database
    if (mealsToUpsert.length > 0) {
      const { error: upsertError } = await supabase.from("meals").upsert(mealsToUpsert, { onConflict: "id" })

      if (upsertError) {
        console.error("Error upserting meals:", upsertError)
        return NextResponse.json({ error: "Failed to sync meals" }, { status: 500 })
      }
    }

    // Get all meals for this device after sync
    const { data: allMeals, error: finalFetchError } = await supabase
      .from("meals")
      .select("*")
      .eq("device_id", deviceId)
      .order("time", { ascending: true })

    if (finalFetchError) {
      console.error("Error fetching final meals:", finalFetchError)
      return NextResponse.json({ error: "Failed to fetch synced meals" }, { status: 500 })
    }

    // Convert back to local format
    const mergedMeals: Record<string, any[]> = {}
    for (const meal of allMeals || []) {
      if (!mergedMeals[meal.date]) {
        mergedMeals[meal.date] = []
      }
      mergedMeals[meal.date].push(meal)
    }

    return NextResponse.json({ mergedMeals })
  } catch (error) {
    console.error("Error in sync-data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
