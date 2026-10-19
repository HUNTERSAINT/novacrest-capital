import { Router } from "express";
import { db, referralsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { GetReferralsResponse } from "@workspace/api-zod";

const router = Router();

router.get("/referrals", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));

  const referralRows = await db
    .select()
    .from(referralsTable)
    .where(eq(referralsTable.referrerId, req.userId!));

  const referralDetails = await Promise.all(
    referralRows.map(async (r) => {
      const [referred] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, r.referredUserId));
      return {
        id: r.id,
        referredUserName: referred?.fullName ?? "Unknown",
        joinedAt: r.createdAt.toISOString(),
        status: r.status as "active" | "inactive",
        bonusEarned: r.bonusEarned,
      };
    })
  );

  const totalEarned = referralRows.reduce((sum, r) => sum + r.bonusEarned, 0);

  res.json(GetReferralsResponse.parse({
    referralCode: user.referralCode,
    referralLink: `https://kingsaintcapital.com/register?ref=${user.referralCode}`,
    totalReferrals: referralRows.length,
    totalEarned,
    referrals: referralDetails,
  }));
});

export default router;
