import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCopyTradingAccess } from "@/lib/subscription";
import { getAccountInfo } from "@/lib/metacopier";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subError = await requireCopyTradingAccess(session.user.id);
  if (subError) return subError;

  const account = await prisma.copyTradingAccount.findUnique({
    where: { id: params.id },
  });

  if (!account || account.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!account.metacopierAccountId) {
    return NextResponse.json({ error: "Account not connected" }, { status: 400 });
  }

  try {
    const info = await getAccountInfo(account.metacopierAccountId);

    // Update cached balance/equity in our DB
    await prisma.copyTradingAccount.update({
      where: { id: params.id },
      data: {
        balance: info.balance,
        equity: info.equity,
      },
    });

    return NextResponse.json({
      balance: info.balance,
      equity: info.equity,
      freeMargin: info.freeMargin,
      usedMargin: info.usedMargin,
      leverage: info.leverage,
    });
  } catch (err) {
    console.error("Status fetch error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
