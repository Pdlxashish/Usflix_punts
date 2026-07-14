/**
 * Couple Activities Service
 * Manages romance activities, responses, and streaks for linked couples.
 */
import pool from "../db/connection.js";
import { getCoupleId, getPartnerUserId } from "./partner-linking.js";
import { broadcastActivityCompleted } from "../websocket/broadcast.js";

/**
 * Mark an activity as completed for a user
 */
export async function completeActivity(
  userId: number,
  activityType: string,
  response?: any
): Promise<{
  ok: boolean;
  partnerCompleted: boolean;
  bothNowComplete: boolean;
  error?: string;
}> {
  const coupleId = await getCoupleId(userId);
  if (!coupleId) {
    return { ok: false, partnerCompleted: false, bothNowComplete: false, error: "Not linked to a partner" };
  }

  const partnerId = await getPartnerUserId(coupleId, userId);
  if (!partnerId) {
    return { ok: false, partnerCompleted: false, bothNowComplete: false, error: "Partner not found" };
  }

  const activityId = `activity-${coupleId}-${activityType}-${new Date().toISOString().split('T')[0]}`;
  const today = new Date().toISOString().split('T')[0];

  try {
    // Get partner's user IDs from couple_id
    const { rows: linkRows } = await pool.query(
      `SELECT user_a_id, user_b_id FROM partner_links WHERE couple_id = $1`,
      [coupleId]
    );

    if (linkRows.length === 0) {
      return { ok: false, partnerCompleted: false, bothNowComplete: false, error: "Partner link not found" };
    }

    const { user_a_id, user_b_id } = linkRows[0];
    const isUserA = userId === user_a_id;

    // Upsert activity record
    const upsertQuery = `
      INSERT INTO couple_activities 
        (id, couple_id, activity_type, activity_date, user_a_completed, user_b_completed, user_a_response, user_b_response)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (couple_id, activity_type, activity_date)
      DO UPDATE SET
        user_a_completed = CASE WHEN $9 THEN TRUE ELSE couple_activities.user_a_completed END,
        user_b_completed = CASE WHEN $9 = FALSE THEN TRUE ELSE couple_activities.user_b_completed END,
        user_a_response = CASE WHEN $9 THEN $7 ELSE couple_activities.user_a_response END,
        user_b_response = CASE WHEN $9 = FALSE THEN $8 ELSE couple_activities.user_b_response END
      RETURNING user_a_completed, user_b_completed
    `;

    const { rows } = await pool.query(upsertQuery, [
      activityId,
      coupleId,
      activityType,
      today,
      isUserA, // user_a_completed
      !isUserA, // user_b_completed
      isUserA ? (response ? JSON.stringify(response) : null) : null, // user_a_response
      !isUserA ? (response ? JSON.stringify(response) : null) : null, // user_b_response
      isUserA, // condition for CASE
    ]);

    const activity = rows[0];
    const partnerCompleted = isUserA ? activity.user_b_completed : activity.user_a_completed;
    const bothNowComplete = activity.user_a_completed && activity.user_b_completed;

    // Get user name for broadcast
    const { rows: userRows } = await pool.query(
      `SELECT display_name FROM users WHERE id = $1`,
      [userId]
    );
    const userName = userRows[0]?.display_name || "Partner";

    // Broadcast to partner
    broadcastActivityCompleted(coupleId, userId, {
      userName,
      activityType,
      date: today,
      bothCompleted: bothNowComplete,
    });

    return {
      ok: true,
      partnerCompleted,
      bothNowComplete,
    };
  } catch (error) {
    console.error("Complete activity error:", error);
    return { ok: false, partnerCompleted: false, bothNowComplete: false, error: "Failed to complete activity" };
  }
}

/**
 * Get today's activity status
 */
export async function getTodayActivity(
  userId: number,
  activityType: string
): Promise<{
  activityType: string;
  youCompleted: boolean;
  partnerCompleted: boolean;
  yourResponse?: any;
  partnerResponse?: any;
} | null> {
  const coupleId = await getCoupleId(userId);
  if (!coupleId) {
    return null;
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    const { rows } = await pool.query(
      `SELECT ca.*, pl.user_a_id, pl.user_b_id
       FROM couple_activities ca
       JOIN partner_links pl ON pl.couple_id = ca.couple_id
       WHERE ca.couple_id = $1
         AND ca.activity_type = $2
         AND ca.activity_date = $3`,
      [coupleId, activityType, today]
    );

    if (rows.length === 0) {
      return {
        activityType,
        youCompleted: false,
        partnerCompleted: false,
      };
    }

    const activity = rows[0];
    const isUserA = userId === activity.user_a_id;

    return {
      activityType,
      youCompleted: isUserA ? activity.user_a_completed : activity.user_b_completed,
      partnerCompleted: isUserA ? activity.user_b_completed : activity.user_a_completed,
      yourResponse: isUserA ? activity.user_a_response : activity.user_b_response,
      partnerResponse: isUserA ? activity.user_b_response : activity.user_a_response,
    };
  } catch (error) {
    console.error("Get today activity error:", error);
    return null;
  }
}

/**
 * Calculate current and longest streaks
 */
export async function getStreaks(
  userId: number,
  activityType: string = "daily"
): Promise<{
  currentStreak: number;
  longestStreak: number;
}> {
  const coupleId = await getCoupleId(userId);
  if (!coupleId) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  try {
    const { rows } = await pool.query(
      `SELECT activity_date, user_a_completed, user_b_completed
       FROM couple_activities
       WHERE couple_id = $1
         AND activity_type = $2
       ORDER BY activity_date DESC`,
      [coupleId, activityType]
    );

    if (rows.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let expectedDate = new Date();
    expectedDate.setHours(0, 0, 0, 0);

    for (const row of rows) {
      const activityDate = new Date(row.activity_date);
      activityDate.setHours(0, 0, 0, 0);

      // Both partners must complete for it to count
      const bothCompleted = row.user_a_completed && row.user_b_completed;

      if (!bothCompleted) {
        if (tempStreak > 0) {
          tempStreak = 0;
          expectedDate = new Date();
          expectedDate.setHours(0, 0, 0, 0);
        }
        continue;
      }

      // Check if this is the expected date (today or consecutive day)
      if (activityDate.getTime() === expectedDate.getTime()) {
        tempStreak++;
        if (currentStreak === 0) currentStreak = tempStreak;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else if (activityDate.getTime() < expectedDate.getTime()) {
        // Streak broken, start new temp streak
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
        expectedDate = new Date(activityDate);
        expectedDate.setDate(expectedDate.getDate() - 1);
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

    return { currentStreak, longestStreak };
  } catch (error) {
    console.error("Get streaks error:", error);
    return { currentStreak: 0, longestStreak: 0 };
  }
}

/**
 * Get activity history
 */
export async function getActivityHistory(
  userId: number,
  activityType: string,
  limit: number = 30
): Promise<Array<{
  date: string;
  activityType: string;
  bothCompleted: boolean;
  youCompleted: boolean;
  partnerCompleted: boolean;
}>> {
  const coupleId = await getCoupleId(userId);
  if (!coupleId) {
    return [];
  }

  try {
    const { rows } = await pool.query(
      `SELECT ca.*, pl.user_a_id
       FROM couple_activities ca
       JOIN partner_links pl ON pl.couple_id = ca.couple_id
       WHERE ca.couple_id = $1
         AND ca.activity_type = $2
       ORDER BY ca.activity_date DESC
       LIMIT $3`,
      [coupleId, activityType, limit]
    );

    return rows.map(row => {
      const isUserA = userId === row.user_a_id;
      return {
        date: row.activity_date,
        activityType: row.activity_type,
        bothCompleted: row.user_a_completed && row.user_b_completed,
        youCompleted: isUserA ? row.user_a_completed : row.user_b_completed,
        partnerCompleted: isUserA ? row.user_b_completed : row.user_a_completed,
      };
    });
  } catch (error) {
    console.error("Get activity history error:", error);
    return [];
  }
}
