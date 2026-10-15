import assert from "node:assert/strict";
import test from "node:test";
import {
  createMatchSchema,
  listMatchesQuerySchema,
  MATCH_STATUS,
  matchIdParamSchema,
  updateScoreSchema,
} from "../src/validation/matches.js";

test("MATCH_STATUS contains the supported lowercase values", () => {
  assert.deepEqual(MATCH_STATUS, {
    SCHEDULED: "scheduled",
    LIVE: "live",
    FINISHED: "finished",
  });
});

test("listMatchesQuerySchema allows an omitted limit", () => {
  assert.deepEqual(listMatchesQuerySchema.parse({}), {});
});

test("listMatchesQuerySchema coerces valid limits and rejects invalid ones", () => {
  assert.deepEqual(listMatchesQuerySchema.parse({ limit: "25" }), {
    limit: 25,
  });
  assert.equal(listMatchesQuerySchema.safeParse({ limit: "0" }).success, false);
  assert.equal(listMatchesQuerySchema.safeParse({ limit: "-1" }).success, false);
  assert.equal(listMatchesQuerySchema.safeParse({ limit: "1.5" }).success, false);
  assert.equal(listMatchesQuerySchema.safeParse({ limit: "101" }).success, false);
  assert.equal(listMatchesQuerySchema.safeParse({ limit: "invalid" }).success, false);
});

test("matchIdParamSchema coerces a required positive integer id", () => {
  assert.deepEqual(matchIdParamSchema.parse({ id: "42" }), { id: 42 });
  assert.equal(matchIdParamSchema.safeParse({}).success, false);
  assert.equal(matchIdParamSchema.safeParse({ id: "0" }).success, false);
  assert.equal(matchIdParamSchema.safeParse({ id: "1.5" }).success, false);
});

const validMatch = {
  sport: "Football",
  homeTeam: "Home",
  awayTeam: "Away",
  startTime: "2026-10-12T10:00:00Z",
  endTime: "2026-10-12T11:00:00Z",
};

test("createMatchSchema accepts valid matches with optional coerced scores", () => {
  assert.deepEqual(
    createMatchSchema.parse({
      ...validMatch,
      homeScore: "2",
      awayScore: 0,
    }),
    {
      ...validMatch,
      homeScore: 2,
      awayScore: 0,
    },
  );
});

test("createMatchSchema requires non-empty match names and valid ISO date strings", () => {
  for (const field of ["sport", "homeTeam", "awayTeam"]) {
    assert.equal(
      createMatchSchema.safeParse({ ...validMatch, [field]: "" }).success,
      false,
      `${field} must not be empty`,
    );
  }

  for (const field of ["startTime", "endTime"]) {
    assert.equal(
      createMatchSchema.safeParse({ ...validMatch, [field]: "not-a-date" })
        .success,
      false,
      `${field} must be a valid ISO date string`,
    );
  }
});

test("createMatchSchema requires endTime to be after startTime", () => {
  assert.equal(
    createMatchSchema.safeParse({
      ...validMatch,
      endTime: "2026-10-12T10:00:00Z",
    }).success,
    false,
  );
  assert.equal(
    createMatchSchema.safeParse({
      ...validMatch,
      endTime: "2026-10-12T09:59:00Z",
    }).success,
    false,
  );
});

test("createMatchSchema rejects invalid optional scores", () => {
  for (const field of ["homeScore", "awayScore"]) {
    for (const value of ["-1", "1.5", "invalid"]) {
      assert.equal(
        createMatchSchema.safeParse({ ...validMatch, [field]: value })
          .success,
        false,
        `${field} must be a non-negative integer`,
      );
    }
  }
});

test("updateScoreSchema requires both coerced non-negative integer scores", () => {
  assert.deepEqual(
    updateScoreSchema.parse({ homeScore: "3", awayScore: "1" }),
    { homeScore: 3, awayScore: 1 },
  );
  assert.equal(
    updateScoreSchema.safeParse({ homeScore: 1 }).success,
    false,
  );

  for (const value of [-1, 1.5, "invalid"]) {
    assert.equal(
      updateScoreSchema.safeParse({ homeScore: value, awayScore: 0 }).success,
      false,
    );
  }
});
