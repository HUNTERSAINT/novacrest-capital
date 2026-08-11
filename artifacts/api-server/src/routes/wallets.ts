import { Router } from "express";
import { db, walletAddressesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

/**
 * GET /wallets
 * Public – returns all active payment wallet addresses.
 * Used by deposit and invest pages to show admin-configured addresses.
 */
router.get("/wallets", async (_req, res): Promise<void> => {
  try {
    const wallets = await db
      .select()
      .from(walletAddressesTable)
      .where(eq(walletAddressesTable.isActive, true))
      .orderBy(walletAddressesTable.cryptoType);
    res.json(wallets);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch wallets" });
  }
});

export default router;
