import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CHECK_AGAIN_HOURS,
  GRACE_HOURS,
  MAX_BINDINGS,
  isSubscriptionLicensable,
} from "@/lib/license";

export const dynamic = "force-dynamic";

type Body = {
  licenseKey?: string;
  mt5Account?: string;
  accountType?: string;
  brokerServer?: string;
};

export async function POST(request: Request) {
  const ip =
    (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "";
  const userAgent = request.headers.get("user-agent") ?? "";

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, reason: "bad_request", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { licenseKey, mt5Account, accountType, brokerServer = "" } = body;

  if (!licenseKey || !mt5Account || !accountType) {
    return NextResponse.json(
      {
        ok: false,
        reason: "bad_request",
        message: "licenseKey, mt5Account and accountType are required",
      },
      { status: 400 }
    );
  }

  const log = (data: { licenseId?: string | null; result: string }) =>
    prisma.licenseValidationLog.create({
      data: {
        licenseId: data.licenseId ?? null,
        keyAttempted: licenseKey,
        mt5Account,
        ipAddress: ip,
        userAgent,
        result: data.result,
      },
    });

  const license = await prisma.license.findUnique({
    where: { key: licenseKey },
    include: { user: true, bindings: true },
  });

  if (!license) {
    await log({ result: "invalid_key" });
    return NextResponse.json(
      { ok: false, reason: "invalid_key", message: "Unknown license key" },
      { status: 403 }
    );
  }

  if (license.status !== "active") {
    await log({ licenseId: license.id, result: "revoked" });
    return NextResponse.json(
      { ok: false, reason: "revoked", message: "License has been revoked" },
      { status: 403 }
    );
  }

  if (!isSubscriptionLicensable(license.user.subscriptionStatus)) {
    await log({ licenseId: license.id, result: "subscription_inactive" });
    return NextResponse.json(
      {
        ok: false,
        reason: "subscription_inactive",
        message: "Subscription is not active",
      },
      { status: 403 }
    );
  }

  const existing = license.bindings.find((b) => b.mt5Account === mt5Account);
  if (!existing && license.bindings.length >= MAX_BINDINGS) {
    await log({ licenseId: license.id, result: "binding_limit" });
    return NextResponse.json(
      {
        ok: false,
        reason: "binding_limit",
        message: `Maximum bound accounts reached (${MAX_BINDINGS})`,
      },
      { status: 403 }
    );
  }

  if (existing) {
    await prisma.licenseBinding.update({
      where: { id: existing.id },
      data: { lastValidatedAt: new Date(), lastIp: ip },
    });
  } else {
    await prisma.licenseBinding.create({
      data: {
        licenseId: license.id,
        mt5Account,
        accountType,
        brokerServer,
        lastIp: ip,
      },
    });
  }

  await log({ licenseId: license.id, result: "ok" });

  return NextResponse.json({
    ok: true,
    expiresAt: license.user.currentPeriodEnd,
    graceHours: GRACE_HOURS,
    checkAgainHours: CHECK_AGAIN_HOURS,
  });
}
