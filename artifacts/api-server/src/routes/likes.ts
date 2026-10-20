import { and, desc, eq, notExists, or } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetLikesResponse,
  MarkLikeReadParams,
} from "@workspace/api-zod";
import {
  blockedUsersTable,
  db,
  matchesTable,
  swipesTable,
  usersTable,
} from "@workspace/db";
import { requireUser } from "../middlewares/require-auth";

const router: IRouter = Router();

function ageOnDate(dateOfBirth: string): number {
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const today = new Date();
  let age = today.getUTCFullYear() - year;
  if (
    today.getUTCMonth() + 1 < month ||
    (today.getUTCMonth() + 1 === month && today.getUTCDate() < day)
  ) {
    age -= 1;
  }
  return age;
}

function canonicalPair(first: string, second: string): [string, string] {
  return first < second ? [first, second] : [second, first];
}

router.get("/likes", requireUser, async (req, res): Promise<void> => {
  const viewerId = req.currentUser!.id;
  const blockedPair = db
    .select({ id: blockedUsersTable.id })
    .from(blockedUsersTable)
    .where(
      or(
        and(
          eq(blockedUsersTable.userId, viewerId),
          eq(blockedUsersTable.blockedUserId, usersTable.id),
        ),
        and(
          eq(blockedUsersTable.userId, usersTable.id),
          eq(blockedUsersTable.blockedUserId, viewerId),
        ),
      ),
    );

  const rows = await db
    .select({
      id: swipesTable.id,
      fromUserId: swipesTable.fromUserId,
      createdAt: swipesTable.createdAt,
      seenAt: swipesTable.seenAt,
      matchId: matchesTable.id,
      fullName: usersTable.fullName,
      dateOfBirth: usersTable.dateOfBirth,
      gender: usersTable.gender,
      area: usersTable.area,
      photoPaths: usersTable.photoPaths,
      isVerified: usersTable.isVerified,
    })
    .from(swipesTable)
    .innerJoin(usersTable, eq(usersTable.id, swipesTable.fromUserId))
    .leftJoin(
      matchesTable,
      or(
        and(
          eq(matchesTable.userOneId, swipesTable.fromUserId),
          eq(matchesTable.userTwoId, viewerId),
        ),
        and(
          eq(matchesTable.userOneId, viewerId),
          eq(matchesTable.userTwoId, swipesTable.fromUserId),
        ),
      ),
    )
    .where(
      and(
        eq(swipesTable.toUserId, viewerId),
        eq(swipesTable.action, "like"),
        eq(usersTable.isBanned, false),
        notExists(blockedPair),
      ),
    )
    .orderBy(desc(swipesTable.createdAt))
    .limit(100);

  // Older one-way likes predate conversation threads. Create their thread when
  // the recipient opens the Likes inbox so they can message from the notification.
  const missingThreads = rows.filter((row) => !row.matchId);
  for (const row of missingThreads) {
    const [userOneId, userTwoId] = canonicalPair(viewerId, row.fromUserId);
    const [reciprocalLike] = await db
      .select({ id: swipesTable.id })
      .from(swipesTable)
      .where(
        and(
          eq(swipesTable.fromUserId, viewerId),
          eq(swipesTable.toUserId, row.fromUserId),
          eq(swipesTable.action, "like"),
        ),
      )
      .limit(1);
    await db
      .insert(matchesTable)
      .values({ userOneId, userTwoId, isMutual: Boolean(reciprocalLike) })
      .onConflictDoNothing();
    if (reciprocalLike) {
      await db
        .update(matchesTable)
        .set({ isMutual: true })
        .where(
          and(
            eq(matchesTable.userOneId, userOneId),
            eq(matchesTable.userTwoId, userTwoId),
          ),
        );
    }
  }

  const threads = await db
    .select({
      id: matchesTable.id,
      userOneId: matchesTable.userOneId,
      userTwoId: matchesTable.userTwoId,
    })
    .from(matchesTable)
    .where(
      or(
        eq(matchesTable.userOneId, viewerId),
        eq(matchesTable.userTwoId, viewerId),
      ),
    );
  const threadByMember = new Map(
    threads.map((thread) => [
      `${thread.userOneId}:${thread.userTwoId}`,
      thread.id,
    ]),
  );

  res.json(
    GetLikesResponse.parse({
      likes: rows.map((row) => {
        const [userOneId, userTwoId] = canonicalPair(viewerId, row.fromUserId);
        const matchId =
          row.matchId ?? threadByMember.get(`${userOneId}:${userTwoId}`);
        if (!matchId) {
          throw new Error("Could not load the conversation for this like.");
        }
        return {
          id: row.id,
          matchId,
          profile: {
            id: row.fromUserId,
            fullName: row.fullName,
            age: ageOnDate(row.dateOfBirth),
            gender: row.gender,
            area: row.area,
            bio: "",
            photoPath: row.photoPaths[0] ?? "",
            isVerified: row.isVerified,
          },
          createdAt: row.createdAt.toISOString(),
          seenAt: row.seenAt?.toISOString() ?? null,
        };
      }),
    }),
  );
});

router.post(
  "/likes/:likeId/read",
  requireUser,
  async (req, res): Promise<void> => {
    const params = MarkLikeReadParams.safeParse(req.params);
    if (!params.success) {
      res.status(404).json({ error: "Like notification not found." });
      return;
    }

    const [updated] = await db
      .update(swipesTable)
      .set({ seenAt: new Date() })
      .where(
        and(
          eq(swipesTable.id, params.data.likeId),
          eq(swipesTable.toUserId, req.currentUser!.id),
          eq(swipesTable.action, "like"),
        ),
      )
      .returning({ id: swipesTable.id });
    if (!updated) {
      res.status(404).json({ error: "Like notification not found." });
      return;
    }
    res.sendStatus(204);
  },
);

export default router;
