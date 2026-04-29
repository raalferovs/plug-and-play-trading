import { randomUUID } from "crypto";
import { prisma } from "./prisma";

export const MAX_BINDINGS = 5;
export const GRACE_HOURS = 72;
export const CHECK_AGAIN_HOURS = 24;

const LICENSABLE_STATUSES = new Set(["active", "trialing"]);

export function isSubscriptionLicensable(status: string) {
  return LICENSABLE_STATUSES.has(status);
}

export async function provisionLicense(userId: string) {
  return prisma.license.upsert({
    where: { userId },
    update: {},
    create: { userId, key: randomUUID() },
  });
}
