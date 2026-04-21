import { describe, it, expect, vi } from 'vitest';
import { logAuditAction } from '../audit-logger';
import { initializeFirebase } from '@/firebase/server';

describe('audit-logger', () => {
    it('should call firestore.collection().add with correct data', async () => {
        const mockAdd = vi.fn().mockResolvedValue({ id: 'test-id' });
        const mockCollection = vi.fn().mockReturnValue({ add: mockAdd });
        
        (initializeFirebase as any).mockReturnValue({
            firestore: {
                collection: mockCollection,
            }
        });

        const params = {
            action: 'PROFILE_UPDATED' as const,
            resourceId: 'res-123',
            metadata: { changes: 'bio' }
        };
        const userId = 'user-456';

        await logAuditAction(params, userId);

        expect(mockCollection).toHaveBeenCalledWith('audit_logs');
        expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
            action: 'PROFILE_UPDATED',
            resourceId: 'res-123',
            userId: 'user-456',
            metadata: { changes: 'bio' },
        }));
    });
});
