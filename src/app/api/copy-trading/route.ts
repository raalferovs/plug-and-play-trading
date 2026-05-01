import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCopyTradingAccess } from "@/lib/subscription";
import {
  createSlaveAccount,
  startAccount,
  createCopier,
  createRiskLimit,
  deleteCopier,
  deleteAccount,
} from "@/lib/metacopier";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Read-only list: kept open even without active subscription so users
  // whose sub lapsed can still see existing accounts and delete them
  // (cleanup keeps MetaCopier resources from accruing costs).
  const accounts = await prisma.copyTradingAccount.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(accounts);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subError = await requireCopyTradingAccess(session.user.id);
  if (subError) return subError;

  try {
    const {
      brokerServer,
      loginNumber,
      password,
      riskMultiplier,
      dailyRiskLimit: dailyRiskLimitIn,
    } = await request.json();

    if (!brokerServer || !loginNumber || !password) {
      return NextResponse.json(
        { error: "Broker server, login number, and password are required" },
        { status: 400 }
      );
    }

    const multiplier = Math.min(Math.max(riskMultiplier ?? 1, 0.1), 10);
    const alias = `PP-${session.user.name}-${loginNumber}`;

    // 1. Create slave account in MetaCopier
    const account = await createSlaveAccount(
      brokerServer,
      loginNumber,
      password,
      alias
    );

    const metacopierAccountId = account.id || account.accountId;

    // 2. Start the account
    await startAccount(metacopierAccountId);

    // 3. Create copier linking to master
    const masterAccountId = process.env.METACOPIER_MASTER_ACCOUNT_ID!;
    const copier = await createCopier(
      metacopierAccountId,
      masterAccountId,
      multiplier
    );

    const metacopierId = copier.id || copier.copierId;

    // 4. Create the daily risk limit. Use client-supplied value if present,
    //    otherwise fall back to the linked formula (multiplier x 10%).
    const dailyRiskLimit = Math.min(
      Math.max(dailyRiskLimitIn ?? multiplier * 10, 1),
      100
    );
    let metacopierRiskLimitId: string;
    try {
      const riskLimit = await createRiskLimit(
        metacopierAccountId,
        dailyRiskLimit
      );
      metacopierRiskLimitId = riskLimit.id;
    } catch (rlErr) {
      // Rollback: tear down the half-created MetaCopier resources so the
      // user does not see ghost slave accounts on retry.
      try {
        await deleteCopier(metacopierAccountId, metacopierId);
      } catch {}
      try {
        await deleteAccount(metacopierAccountId);
      } catch {}
      throw rlErr;
    }

    // 5. Save to database
    const copyAccount = await prisma.copyTradingAccount.create({
      data: {
        userId: session.user.id,
        metacopierAccountId,
        metacopierId,
        metacopierRiskLimitId,
        brokerServer,
        loginNumber,
        status: "active",
        riskMultiplier: multiplier,
        dailyRiskLimit,
        alias,
      },
    });

    return NextResponse.json(copyAccount);
  } catch (err) {
    console.error("Copy trading connect error:", err);
    const message = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
