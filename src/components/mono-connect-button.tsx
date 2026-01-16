'use client';
import { Button } from '@/components/ui/button';
import { Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// This feature is temporarily disabled due to persistent package installation issues.
export function MonoConnectButton() {
  const { toast } = useToast();

  const handleClick = () => {
    toast({
      variant: "destructive",
      title: "Feature Temporarily Disabled",
      description: "Bank account linking is currently unavailable. We are working on a solution.",
    });
  };

  return (
    <Button onClick={handleClick}>
        <LinkIcon className="mr-2 h-4 w-4" />
        Connect New Account
    </Button>
  );
}
