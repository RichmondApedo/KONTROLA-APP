'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";


export default function HelpPage() {
    const { toast } = useToast();
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true);

        // Simulate sending a message
        setTimeout(() => {
            setIsSending(false);
            setSubject('');
            setMessage('');
            toast({
                title: "Message Sent!",
                description: "Our priority support team will get back to you shortly.",
            });
        }, 1500);
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight">Help & Support</h1>
                <p className="text-muted-foreground">Have questions? We're here to help.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Priority Support</CardTitle>
                    <CardDescription>As a premium user, your inquiries are our top priority. Fill out the form below to contact us.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input 
                                id="subject" 
                                placeholder="e.g., Issue with bill tracking" 
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="message">Message</Label>
                            <Textarea 
                                id="message" 
                                placeholder="Please describe your issue in detail..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                required 
                                rows={6}
                            />
                        </div>
                         <Button type="submit" disabled={isSending}>
                            {isSending ? 'Sending...' : 'Send Message'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Frequently Asked Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div>
                        <h3 className="font-semibold">How do I connect my bank account?</h3>
                        <p className="text-muted-foreground text-sm">Navigate to Settings {'>'} Connected Accounts and click the "Connect" button. This feature is coming soon!</p>
                   </div>
                    <div>
                        <h3 className="font-semibold">How is my data secured?</h3>
                        <p className="text-muted-foreground text-sm">We use bank-level encryption and robust security protocols to ensure your data is always safe and private.</p>
                   </div>
                </CardContent>
            </Card>
        </div>
    );
}
