/**
 * Security Middleware — rate limits, headers, logging.
 * Rate limits are skipped when isRateLimitDisabled() (default in development).
 */
import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";

import { isRateLimitDisabled } from "../config/auth.js";

const noopLimiter = (_req: Request, _res: Response, next: NextFunction) => next();

function createLimiter(options: Parameters<typeof rateLimit>[0]) {
  if (isRateLimitDisabled()) {
    return noopLimiter;
  }
  return rateLimit(options);
}

/**
 * Rate limiter for general API requests
 */
export const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { ok: false, error: "Too many requests from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { ok: false, error: "Too many login attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

/**
 * Rate limiter for file uploads
 */
export const uploadLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { ok: false, error: "Too many uploads, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Security headers middleware (alternative to helmet)
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");
  
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  
  // Enable XSS protection
  res.setHeader("X-XSS-Protection", "1; mode=block");
  
  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // Content Security Policy (adjust as needed)
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' data: https:; media-src 'self' https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    );
  }
  
  next();
}

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    const log = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    };
    
    if (res.statusCode >= 400) {
      console.error("❌", JSON.stringify(log));
    } else {
      console.log("✅", JSON.stringify(log));
    }
  });
  
  next();
}

/**
 * Error handler middleware
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error("Error:", err);
  
  // Don't leak error details in production
  const isDev = process.env.NODE_ENV === "development";
  
  res.status(err.status || 500).json({
    ok: false,
    error: isDev ? err.message : "Internal server error",
    ...(isDev && { stack: err.stack }),
  });
}
