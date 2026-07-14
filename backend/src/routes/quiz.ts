/**
 * Relationship Quiz routes — "How well do you know us?"
 * 🔒 SECURED WITH USER-LEVEL ISOLATION
 * 
 * GET /api/quiz             — authenticated user, returns questions without answers
 * GET /api/quiz/answers     — authenticated user, returns answers after quiz
 * GET /api/quiz/admin       — admin only, returns all questions with answers
 * POST /api/quiz            — admin only, creates for admin's user
 * PUT /api/quiz/:id         — admin only, updates only if owned
 * DELETE /api/quiz/:id      — admin only, deletes only if owned
 */
import { Router, Request, Response } from "express";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
import { requireUserAuth } from "../middleware/userAuth.js";
import { getSpaceUserIdFromRequest, getRequestUserId, resolveSpaceUserIds } from "../utils/tenant.js";
import { randomUUID } from "crypto";

const router = Router();

function migrationError(err: any): string | null {
  return err?.message?.includes("does not exist")
    ? "Table not found — please restart the backend server to run migrations."
    : null;
}

function mapRow(r: any, includeAnswer = false) {
  return {
    id: r.id,
    question: r.question,
    optionA: r.option_a,
    optionB: r.option_b,
    optionC: r.option_c,
    optionD: r.option_d,
    ...(includeAnswer ? { correctOption: r.correct_option } : {}),
    funFact: r.fun_fact,
    sortRank: r.sort_rank,
    createdAt: r.created_at,
  };
}

/** GET /api/quiz — authenticated user (no correct answers exposed) */
router.get("/", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }
    
    const spaceUserIds = await resolveSpaceUserIds(userId);
    const placeholders = spaceUserIds.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await pool.query(
      `SELECT * FROM quiz_questions WHERE user_id IN (${placeholders}) ORDER BY sort_rank ASC, created_at ASC`,
      spaceUserIds
    );
    res.json(rows.map((r) => mapRow(r, false)));
  } catch (err: any) {
    console.error("quiz GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch quiz" });
  }
});

/** GET /api/quiz/answers — authenticated user, check answers after quiz */
router.get("/answers", requireUserAuth, async (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }
    
    const spaceUserIds = await resolveSpaceUserIds(userId);
    const placeholders = spaceUserIds.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await pool.query(
      `SELECT id, correct_option, fun_fact FROM quiz_questions WHERE user_id IN (${placeholders}) ORDER BY sort_rank ASC, created_at ASC`,
      spaceUserIds
    );
    res.json(rows.map((r) => ({ id: r.id, correctOption: r.correct_option, funFact: r.fun_fact })));
  } catch (err: any) {
    console.error("quiz answers GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch answers" });
  }
});

/** GET /api/quiz/admin — admin only, includes correct answers */
router.get("/admin", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = await getSpaceUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }

    const { rows } = await pool.query(
      "SELECT * FROM quiz_questions WHERE user_id = $1 ORDER BY sort_rank ASC, created_at ASC",
      [userId]
    );
    res.json(rows.map((r) => mapRow(r, true)));
  } catch (err: any) {
    console.error("quiz admin GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch quiz" });
  }
});

/** POST /api/quiz */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { question, optionA, optionB, optionC, optionD, correctOption, funFact, sortRank } = req.body;
    if (!question?.trim()) {
      res.status(400).json({ ok: false, error: "question is required" });
      return;
    }
    if (!["a", "b", "c", "d"].includes(correctOption)) {
      res.status(400).json({ ok: false, error: "correctOption must be a, b, c, or d" });
      return;
    }

    const userId = await getSpaceUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }

    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO quiz_questions (id, user_id, question, option_a, option_b, option_c, option_d, correct_option, fun_fact, sort_rank)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [id, userId, question.trim(), optionA?.trim() || "", optionB?.trim() || "", optionC?.trim() || "", optionD?.trim() || "", correctOption, funFact?.trim() || "", sortRank ?? 0]
    );
    res.status(201).json({ ok: true, question: mapRow(rows[0], true) });
  } catch (err: any) {
    console.error("quiz POST error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to create question" });
  }
});

/** PUT /api/quiz/:id */
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { question, optionA, optionB, optionC, optionD, correctOption, funFact, sortRank } = req.body;
    if (!question?.trim()) {
      res.status(400).json({ ok: false, error: "question is required" });
      return;
    }
    if (!["a", "b", "c", "d"].includes(correctOption)) {
      res.status(400).json({ ok: false, error: "correctOption must be a, b, c, or d" });
      return;
    }

    const userId = await getSpaceUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }

    const { rows } = await pool.query(
      `UPDATE quiz_questions SET question=$1, option_a=$2, option_b=$3, option_c=$4, option_d=$5,
       correct_option=$6, fun_fact=$7, sort_rank=$8 WHERE id=$9 AND user_id=$10 RETURNING *`,
      [question.trim(), optionA?.trim() || "", optionB?.trim() || "", optionC?.trim() || "", optionD?.trim() || "", correctOption, funFact?.trim() || "", sortRank ?? 0, id, userId]
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Question not found or access denied" });
      return;
    }
    res.json({ ok: true, question: mapRow(rows[0], true) });
  } catch (err: any) {
    console.error("quiz PUT error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to update question" });
  }
});

/** DELETE /api/quiz/:id */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const userId = await getSpaceUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({ ok: false, error: "Authentication required" });
      return;
    }

    const result = await pool.query("DELETE FROM quiz_questions WHERE id=$1 AND user_id=$2", [id, userId]);
    
    if (result.rowCount === 0) {
      res.status(404).json({ ok: false, error: "Question not found or access denied" });
      return;
    }

    res.json({ ok: true });
  } catch (err: any) {
    console.error("quiz DELETE error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to delete question" });
  }
});

export default router;
