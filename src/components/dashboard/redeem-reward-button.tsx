'use client';

import { useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import type { UserProfile } from '@/lib/types';
import { Award, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, arrayUnion, increment } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface Reward {
  id: string;
  title: string;
  cost: number;
}

interface RedeemRewardButtonProps {
  reward: Reward;
  profile: UserProfile | null;
}

export function RedeemRewardButton({ reward, profile }: RedeemRewardButtonProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isRedeeming, setIsRedeeming] = useState(false);

  const hasEnoughPoints = profile && (profile.points ?? 0) >= reward.cost;
  const isAlreadyRedeemed = profile?.unlockedRewardIds?.includes(reward.id);

  const handleRedeem = async () => {
    if (!user || !firestore || !profile || !hasEnoughPoints || isAlreadyRedeemed) return;

    setIsRedeeming(true);
    try {
      const profileRef = doc(firestore, `users/${user.uid}/profile/${user.uid}`);
      
      // Non-blocking update
      updateDocumentNonBlocking(profileRef, {
        points: increment(-reward.cost),
        unlockedRewardIds: arrayUnion(reward.id),
      });

      toast({
        title: 'Reward Redeemed!',
        description: `You have successfully unlocked "${reward.title}".`,
      });
    } catch (error) {
      console.error('Error redeeming reward:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not redeem reward. Please try again.',
      });
    } finally {
      setIsRedeeming(false);
    }
  };
  
  if (isAlreadyRedeemed) {
    return (
        <Button disabled variant="outline">
          <CheckCircle className="mr-2" /> Unlocked
        </Button>
    );
  }

  return (
    <Button onClick={handleRedeem} disabled={!hasEnoughPoints || isRedeeming}>
      {isRedeeming ? (
        <Loader2 className="mr-2 animate-spin" />
      ) : (
        <Award className="mr-2" />
      )}
      Redeem
    </Button>
  );
}
