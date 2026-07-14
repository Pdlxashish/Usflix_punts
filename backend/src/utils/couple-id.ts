/**
 * Couple ID generation utility for partner linking system.
 */
import { randomBytes } from "crypto";
import pool from "../db/connection.js";

/**
 * Generates a unique couple_id for a partner link.
 * Format: couple-{timestamp}-{random}
 * 
 * @returns Unique couple_id string
 */
export async function generateCoupleId(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    const timestamp = Date.now();
    const randomSuffix = randomBytes(6).toString("hex");
    const coupleId = `couple-${timestamp}-${randomSuffix}`;

    // Check uniqueness against partner_links table
    const { rows } = await pool.query(
      "SELECT 1 FROM partner_links WHERE couple_id = $1",
      [coupleId]
    );

    if (rows.length === 0) {
      return coupleId;
    }

    attempts++;
    // Small delay to ensure different timestamp on retry
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error("Failed to generate unique couple_id after multiple attempts");
}

/**
 * Validates a couple_id format.
 * 
 * @param coupleId - The couple_id to validate
 * @returns true if valid format, false otherwise
 */
export function isValidCoupleIdFormat(coupleId: string): boolean {
  // Format: couple-{timestamp}-{random}
  const pattern = /^couple-\d{13}-[a-f0-9]{12}$/;
  return pattern.test(coupleId);
}
