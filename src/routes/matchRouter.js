import { Router } from "express";
import {
  createMatchSchema,
  listMatchesQuerySchema,
} from "../validation/matches.js";
import { db } from "../db/db.js";
import { matches } from "../db/schema.js";
import { getMatchStatus } from "../utils/match-status.js";
import { desc } from "drizzle-orm";

export const matchRouter = Router();

const MAX_LIMIT = 100;

matchRouter.get("/", async (req, res) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "invalid query", details: parsed.error.issues });
  }

  const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

  try {
    const data = await db
      .select()
      .from(matches)
      .limit(limit)
      .orderBy(desc(matches.createdAt));

    res.json({ data });
  } catch (error) {
    console.error("Error fetching matches:", error);
    res
      .status(500)
      .json({
        error: "failed to fetch matches",
        details: JSON.stringify(error),
      });
  }
});

matchRouter.post("/", async (req, res) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "invalid payload", details: parsed.error.issues });
  }
  const { startTime, endTime, homeScore, awayScore } = parsed.data;

  try {
    const [event] = await db
      .insert(matches)
      .values({
        ...parsed.data,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        homeScore: homeScore ?? 0,
        awayScore: awayScore ?? 0,
        status: getMatchStatus(startTime, endTime),
      })
      .returning();
    console.log("Match created:", event);
    console.log(
      "Broadcast function:",
      typeof req.app.locals.broadcastMatchCreated,
    );

    req.app.locals.broadcastMatchCreated(event);

    console.log("Broadcast function called");

    res.status(201).json({ data: event });
  } catch (error) {
    console.error("Error creating match:", error);
    res
      .status(500)
      .json({
        error: "failed to create match",
        details: JSON.stringify(error),
      });
  }
});
