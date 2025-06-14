import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Sync not available - database not configured" }, { status: 500 })
    }

    const { deviceName } = await request.json()

    if (!deviceName) {
      return NextResponse.json({ error: "Device name is required" }, { status: 400 })
    }

    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // Set expiration to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from("sync_codes")
      .insert([
        {
          code,
          device_name: deviceName,
          expires_at: expiresAt,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Error creating sync code:", error)
      return NextResponse.json({ error: "Failed to generate sync code" }, { status: 500 })
    }

    return NextResponse.json({ code })
  } catch (error) {
    console.error("Error in generate-code:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
