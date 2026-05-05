import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export type RateLimitType = 'ai_flow' | 'api_call';

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

const PLAN_LIMITS: Record<string, number> = {
  'free': 10,       // 10 AI requests per day
  'premium': 100,   // 100 AI requests per day
  'pro-plus': 500,  // 500 AI requests per day
};

/**
 * Server-side rate limiter using Firestore.
 * This is designed to be used in API routes or server-side flows.
 */
export async function checkRateLimit(
  db: admin.firestore.Firestore,
  userId: string,
  type: RateLimitType = 'ai_flow',
  incrementBy: number = 1
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  // 1. Get User Plan — also enforce subscription expiry in real-time
  const profileRef = db.doc(`users/${userId}/profile/${userId}`);
  const profileSnap = await profileRef.get();
  const profile = profileSnap.data();

  // If subscriptionExpiry exists and has passed, treat this user as 'free'
  // regardless of what the plan field says. This acts as a real-time guard
  // between scheduled cron runs.
  let plan = profile?.plan || 'free';
  if (plan !== 'free' && profile?.subscriptionExpiry) {
    const expiryMs =
      typeof profile.subscriptionExpiry.toMillis === 'function'
        ? profile.subscriptionExpiry.toMillis()      // Firestore Timestamp
        : new Date(profile.subscriptionExpiry).getTime(); // plain Date / ISO string
    if (expiryMs <= Date.now()) {
      plan = 'free';
    }
  }

  const limit = PLAN_LIMITS[plan] || 10;

  // 2. Get Current Date (Window)
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  
  const limitRef = db.doc(`system_rate_limits/${userId}_${type}_${dateStr}`);

  return await db.runTransaction(async (transaction) => {
    const limitSnap = await transaction.get(limitRef);
    let count = 0;

    if (limitSnap.exists) {
      count = limitSnap.data()?.count || 0;
    }

    if (count + incrementBy > limit) {
      return { allowed: false, remaining: limit - count, limit };
    }

    // Increment count
    const newCount = count + incrementBy;
    transaction.set(limitRef, {
      userId,
      type,
      date: dateStr,
      count: newCount,
      lastRequest: Timestamp.now(),
      // TTL for Firestore (if configured in Firebase Console)
      expiresAt: Timestamp.fromDate(new Date(now.getTime() + 48 * 60 * 60 * 1000)), // 2 days TTL
    }, { merge: true });

    return { allowed: true, remaining: limit - newCount, limit };
  });
}
