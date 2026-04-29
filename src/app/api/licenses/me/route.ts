import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { provisionLicense } from "@/lib/license";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let license = await prisma.license.findUnique({
    where: { userId: session.user.id },
    include: {
      user: { select: { subscriptionStatus: true, currentPeriodEnd: true } },
      _count: { select: { bindings: true } },
    },
  });

  if (!license) {
    await provisionLicense(session.user.id);
    license = await prisma.license.findUnique({
      where: { userId: session.user.id },
      include: {
        user: { select: { subscriptionStatus: true, currentPeriodEnd: true } },
        _count: { select: { bindings: true } },
      },
    });
  }

  if (!license) {
    return NextResponse.json(
      { error: "Failed to provision license" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    key: license.key,
    status: license.status,
    subscriptionStatus: license.user.subscriptionStatus,
    currentPeriodEnd: license.user.currentPeriodEnd,
    bindingCount: license._count.bindings,
  });
}
