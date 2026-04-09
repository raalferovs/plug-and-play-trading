import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBrokers } from "@/lib/metacopier";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const brokers = await getBrokers();
    return NextResponse.json(brokers);
  } catch (err) {
    console.error("Failed to fetch brokers:", err);
    return NextResponse.json(
      { error: "Failed to fetch broker list" },
      { status: 500 }
    );
  }
}
