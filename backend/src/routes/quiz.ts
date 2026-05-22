/**
 * Relationship Quiz routes — "How well do you know us?"
 * GET /api/quiz             — public, returns all questions (without correct answers)
 * GET /api/quiz/admin       — admin only, returns all questions with answers
 * POST /api/quiz            — admin only
 * PUT /api/quiz/:id         — admin only
 * DELETE /api/quiz/:id      — admin only
 */
import { Router, Request, Response } from "express";
import pool from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";
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

/** GET /api/quiz — public (no correct answers exposed) */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM quiz_questions ORDER BY sort_rank ASC, created_at ASC"
    );
    res.json(rows.map((r) => mapRow(r, false)));
  } catch (err: any) {
    console.error("quiz GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch quiz" });
  }
});

/** GET /api/quiz/answers — public endpoint to check answers after quiz */
router.get("/answers", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, correct_option, fun_fact FROM quiz_questions ORDER BY sort_rank ASC, created_at ASC"
    );
    res.json(rows.map((r) => ({ id: r.id, correctOption: r.correct_option, funFact: r.fun_fact })));
  } catch (err: any) {
    console.error("quiz answers GET error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to fetch answers" });
  }
});

/** GET /api/quiz/admin — admin only, includes correct answers */
router.get("/admin", requireAuth, async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM quiz_questions ORDER BY sort_rank ASC, created_at ASC"
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
    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO quiz_questions (id, question, option_a, option_b, option_c, option_d, correct_option, fun_fact, sort_rank)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [id, question.trim(), optionA?.trim() || "", optionB?.trim() || "", optionC?.trim() || "", optionD?.trim() || "", correctOption, funFact?.trim() || "", sortRank ?? 0]
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
    const { rows } = await pool.query(
      `UPDATE quiz_questions SET question=$1, option_a=$2, option_b=$3, option_c=$4, option_d=$5,
       correct_option=$6, fun_fact=$7, sort_rank=$8 WHERE id=$9 RETURNING *`,
      [question.trim(), optionA?.trim() || "", optionB?.trim() || "", optionC?.trim() || "", optionD?.trim() || "", correctOption, funFact?.trim() || "", sortRank ?? 0, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ ok: false, error: "Question not found" });
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
    await pool.query("DELETE FROM quiz_questions WHERE id=$1", [id]);
    res.json({ ok: true });
  } catch (err: any) {
    console.error("quiz DELETE error:", err);
    res.status(500).json({ ok: false, error: migrationError(err) || "Failed to delete question" });
  }
});

export default router;
