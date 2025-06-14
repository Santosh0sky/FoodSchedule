import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Sync not available - database not configured" }, { status: 500 })
    }

    const { code, deviceId } = await request.json()

    if (!code || !deviceId) {
      return NextResponse.json({ error: "Code and device ID are required" }, { status: 400 })
    }

    // Check if code exists and is valid
    const { data: syncCode, error: fetchError } = await supabase
      .from("sync_codes")
      .select("*")
      .eq("code", code)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (fetchError || !syncCode) {
      return NextResponse.json({ error: "Invalid or expired sync code" }, { status: 400 })
    }

    // Mark code as used
    const { error: updateError } = await supabase.from("sync_codes").update({ used: true }).eq("id", syncCode.id)

    if (updateError) {
      console.error("Error updating sync code:", updateError)
      return NextResponse.json({ error: "Failed to use sync code" }, { status: 500 })
    }

    // Get all meals for this sync group (we'll use the code as a group identifier)
    const { data: meals, error: mealsError } = await supabase
      .from("meals")
      .select("*")
      .or(`device_id.eq.${deviceId},user_id.eq.${syncCode.id}`)

    if (mealsError) {
      console.error("Error fetching meals:", mealsError)
      return NextResponse.json({ error: "Failed to fetch synced meals" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      meals: meals || [],
      syncGroup: syncCode.id,
    })
  } catch (error) {
    console.error("Error in use-code:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
