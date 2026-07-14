/**
 * Re-exports from the unified Clerk auth middleware.
 */
export {
  requireAuth as requireUserAuth,
  optionalAuth as optionalUserAuth,
  requireAuth,
  optionalAuth,
  resolveInternalUser,
  type AuthPayload,
  type AuthPayload as UserAuthPayload,
} from "./auth.js";
