'use client';

import { useState } from 'react';
import { useUser, useUserProfile, useFirestore } from '@/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
    Mail, 
    Phone, 
    MessageCircle, // Using MessageCircle for WhatsApp
    Send,
    LifeBuoy,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HelpPage() {
    const { user } = useUser();
    const { profile } = useUserProfile();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        subject: '',
        category: 'General Inquiry',
        message: ''
    });

    const contactMethods = [
        {
            icon: Mail,
            label: 'Email Support',
            value: 'support@kontrolaapp.com',
            href: 'mailto:support@kontrolaapp.com',
            color: 'text-blue-500',
            bg: 'bg-blue-500/10'
        },
        {
            icon: MessageCircle,
            label: 'WhatsApp',
            value: '+233 501705890',
            href: 'https://wa.me/233501705890',
            color: 'text-green-500',
            bg: 'bg-green-500/10'
        },
        {
            icon: Phone,
            label: 'Call Us',
            value: '+233 501705890',
            href: 'tel:+233501705890',
            color: 'text-orange-500',
            bg: 'bg-orange-500/10'
        }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !firestore) return;

        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore, 'supportTickets'), {
                userId: user.uid,
                userEmail: user.email,
                userName: profile?.firstName || user.displayName || 'Anonymous',
                subject: formData.subject,
                category: formData.category,
                message: formData.message,
                status: 'open',
                createdAt: Timestamp.now()
            });

            setIsSubmitted(true);
            toast({
                title: "Support Ticket Created",
                description: "We've received your message and will get back to you soon.",
            });
        } catch (error: any) {
            console.error("Error creating support ticket:", error);
            toast({
                variant: 'destructive',
                title: "Submission Failed",
                description: "Could not send your message. Please try WhatsApp or Email.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-primary animate-in zoom-in-50 duration-500" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Message Received!</h1>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Thank you for reaching out. A member of our support team will contact you via email shortly.
                    </p>
                </div>
                <Button onClick={() => setIsSubmitted(false)} variant="outline">
                    Send Another Message
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-10">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
                    <LifeBuoy className="h-8 w-8 text-primary" />
                    Help & Support
                </h1>
                <p className="text-muted-foreground">How can we assist you with Kontrola today?</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {contactMethods.map((method) => (
                    <a 
                        key={method.label} 
                        href={method.href} 
                        target={method.label === 'WhatsApp' ? '_blank' : undefined}
                        rel={method.label === 'WhatsApp' ? 'noopener noreferrer' : undefined}
                        className="group"
                    >
                        <Card className="h-full transition-all duration-200 hover:border-primary/50 hover:shadow-md">
                            <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                                <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110", method.bg)}>
                                    <method.icon className={cn("h-6 w-6", method.color)} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-sm">{method.label}</h3>
                                    <p className="text-xs text-muted-foreground">{method.value}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </a>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="lg:col-span-1 shadow-sm">
                    <CardHeader>
                        <CardTitle>Send us a Message</CardTitle>
                        <CardDescription>Fill out the form below for complaints, feature requests, or technical support.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject</Label>
                                <Input 
                                    id="subject" 
                                    placeholder="Brief summary of your issue" 
                                    required 
                                    value={formData.subject}
                                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Select 
                                    value={formData.category} 
                                    onValueChange={(val) => setFormData({...formData, category: val})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Complaint">Complaint</SelectItem>
                                        <SelectItem value="Feature Request">Feature Request</SelectItem>
                                        <SelectItem value="Bug Report">Technical Issue/Bug</SelectItem>
                                        <SelectItem value="Account Inquiry">Account/Payment</SelectItem>
                                        <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="message">Message</Label>
                                <Textarea 
                                    id="message" 
                                    placeholder="Describe your issue in detail..." 
                                    className="min-h-[150px]" 
                                    required 
                                    value={formData.message}
                                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        Submit Ticket
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader>
                            <CardTitle className="text-lg">Quick Assistance</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-4 text-foreground/80 leading-relaxed">
                            <p>
                                <strong>Response Time:</strong> We typically respond to email inquiries within 2-4 business hours. For immediate assistance, please use WhatsApp or Phone.
                            </p>
                            <p>
                                <strong>Operating Hours:</strong> Monday - Friday, 8:00 AM - 6:00 PM (GMT).
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Try our Support Assistant</CardTitle>
                            <CardDescription>Get instant answers to common questions about features and app usage.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Button variant="outline" className="w-full group" asChild>
                                <a href="/dashboard/ask">
                                    Chat with Ask KONTROLA
                                    <LifeBuoy className="ml-2 h-4 w-4 transition-transform group-hover:rotate-12" />
                                </a>
                             </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
