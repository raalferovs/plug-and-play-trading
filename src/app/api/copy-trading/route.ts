import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createSlaveAccount,
  startAccount,
  createCopier,
} from "@/lib/metacopier";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  try {
    const { brokerServer, loginNumber, password, riskMultiplier } =
      await request.json();

    if (!brokerServer || !loginNumber || !password) {
      return NextResponse.json(
        { error: "Broker server, login number, and password are required" },
        { status: 400 }
      );
    }

    const multiplier = Math.min(Math.max(riskMultiplier || 1, 0.1), 5);
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
    const masterAlias = process.env.METACOPIER_MASTER_ALIAS!;
    const copier = await createCopier(
      metacopierAccountId,
      masterAlias,
      multiplier
    );

    const metacopierId = copier.id || copier.copierId;

    // 4. Save to database
    const copyAccount = await prisma.copyTradingAccount.create({
      data: {
        userId: session.user.id,
        metacopierAccountId,
        metacopierId,
        brokerServer,
        loginNumber,
        status: "active",
        riskMultiplier: multiplier,
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
