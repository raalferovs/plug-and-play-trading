import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  updateCopier,
  stopAccount,
  deleteCopier,
  deleteAccount,
} from "@/lib/metacopier";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await prisma.copyTradingAccount.findUnique({
    where: { id: params.id },
  });

  if (!account || account.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { riskMultiplier } = await request.json();
    const multiplier = Math.min(Math.max(riskMultiplier || 1, 0.1), 5);

    if (account.metacopierAccountId && account.metacopierId) {
      await updateCopier(account.metacopierAccountId, account.metacopierId, {
        multiplier,
      });
    }

    const updated = await prisma.copyTradingAccount.update({
      where: { id: params.id },
      data: { riskMultiplier: multiplier },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Update copier error:", err);
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await prisma.copyTradingAccount.findUnique({
    where: { id: params.id },
  });

  if (!account || account.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    if (account.metacopierAccountId) {
      // Stop account, delete copier, delete account
      try {
        await stopAccount(account.metacopierAccountId);
      } catch {
        // Account may already be stopped
      }

      if (account.metacopierId) {
        try {
          await deleteCopier(
            account.metacopierAccountId,
            account.metacopierId
          );
        } catch {
          // Copier may already be deleted
        }
      }

      try {
        await deleteAccount(account.metacopierAccountId);
      } catch {
        // Account may already be deleted
      }
    }

    await prisma.copyTradingAccount.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Disconnect error:", err);
    const message = err instanceof Error ? err.message : "Disconnect failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
