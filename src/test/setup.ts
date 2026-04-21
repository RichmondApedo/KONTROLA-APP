import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Firebase
vi.mock('@/firebase/server', () => ({
  initializeFirebase: vi.fn(() => ({
    firestore: {
      collection: vi.fn(() => ({
        add: vi.fn(),
      })),
    },
  })),
}));

vi.mock('firebase-admin', () => ({
  firestore: {
    FieldValue: {
      serverTimestamp: vi.fn(() => new Date()),
    },
  },
}));
