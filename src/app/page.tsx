import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { hasActiveAccess } from "@/lib/subscription";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Pro/trialing/admin users land in chat. Everyone else lands on bots.
  const hasChatAccess =
    hasActiveAccess(session.user.subscriptionStatus) ||
    session.user.role === "admin";

  redirect(hasChatAccess ? "/chat" : "/bots");
}
