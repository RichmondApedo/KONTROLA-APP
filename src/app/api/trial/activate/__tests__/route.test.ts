import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { initializeFirebase } from '@/firebase/server';
import * as admin from 'firebase-admin';
import { logAuditAction } from '@/lib/audit-logger';

// Use vi.hoisted for variables that need to be accessed inside hoisted mocks
const { mockAuth, mockVerifyIdToken } = vi.hoisted(() => {
  const verifyFn = vi.fn();
  return {
    mockVerifyIdToken: verifyFn,
    mockAuth: vi.fn(() => ({
      verifyIdToken: verifyFn,
    })),
  };
});

// Mock audit-logger
vi.mock('@/lib/audit-logger', () => ({
  logAuditAction: vi.fn(),
}));

// Mock firebase-admin Auth using the hoisted mockAuth
vi.mock('firebase-admin', async (importOriginal) => {
  const original = await importOriginal<typeof admin>();
  return {
    ...original,
    auth: mockAuth,
    firestore: {
      Timestamp: {
        fromDate: (d: Date) => d,
      },
    },
  };
});

// Import POST after the mocks are set up to ensure it picks them up
import { POST } from '../route';

describe('POST /api/trial/activate', () => {
  let mockUpdate: any;
  let mockGet: any;
  let mockDoc: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUpdate = vi.fn().mockResolvedValue(undefined);
    mockGet = vi.fn();
    mockDoc = vi.fn().mockReturnValue({
      get: mockGet,
      update: mockUpdate,
    });

    (initializeFirebase as any).mockReturnValue({
      firestore: {
        doc: mockDoc,
      },
      firebaseAdminApp: {},
    });
  });

  const createRequest = (token?: string) => {
    const headers = new Headers();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return new NextRequest('http://localhost/api/trial/activate', {
      method: 'POST',
      headers,
    });
  };

  it('should return 401 if Authorization header is missing', async () => {
    const req = createRequest();
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized.');
  });

  it('should return 404 if user profile does not exist', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });
    mockGet.mockResolvedValue({ exists: false });

    const req = createRequest('valid-token');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('User profile not found.');
    expect(mockDoc).toHaveBeenCalledWith('users/user-123/profile/user-123');
  });

  it('should return 403 if user has already used a trial', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        plan: 'free',
        trialUsed: true,
      }),
    });

    const req = createRequest('valid-token');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('Free trial has already been used on this account.');
  });

  it('should return 403 if user is already on a paid plan', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        plan: 'premium',
        trialUsed: false,
      }),
    });

    const req = createRequest('valid-token');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('Free trial is only available for accounts on the Free plan.');
  });

  it('should successfully activate trial and return 200 with expiry date', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        plan: 'free',
        trialUsed: false,
      }),
    });

    const req = createRequest('valid-token');
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.expiresAt).toBeDefined();

    // Check Firestore update call
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'pro-plus',
        subscriptionStatus: 'active',
        paystackSubscriptionCode: 'FREE_TRIAL',
        trialUsed: true,
      })
    );

    // Check audit logging call
    expect(logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TRIAL_ACTIVATED',
      }),
      'user-123'
    );
  });
});
