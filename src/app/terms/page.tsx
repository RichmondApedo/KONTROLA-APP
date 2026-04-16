'use client';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfServicePage() {
  const router = useRouter();
  const effectiveDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="bg-background text-foreground min-h-screen py-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
            <Button 
                variant="ghost" 
                onClick={() => router.back()}
                className="text-xs font-black uppercase tracking-widest gap-2 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary px-0"
            >
                <ArrowLeft className="h-4 w-4" /> Go Back
            </Button>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-extrabold tracking-tight text-primary">
              Terms of Service for KONTROLA
            </CardTitle>
            <p className="text-muted-foreground">Effective Date: {effectiveDate}</p>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose-base dark:prose-invert max-w-none space-y-6">
            <p>
              Welcome to Kontrola! These terms and conditions outline the rules and regulations for the use of Kontrola's application. By accessing this app we assume you accept these terms and conditions. Do not continue to use Kontrola if you do not agree to take all of the terms and conditions stated on this page.
            </p>

            <Separator />

            <section>
              <h2 className="font-semibold text-xl">1. License to Use</h2>
              <p>
                Unless otherwise stated, Kontrola and/or its licensors own the intellectual property rights for all material on Kontrola. All intellectual property rights are reserved. You may access this from Kontrola for your own personal use subjected to restrictions set in these terms and conditions.
              </p>
               <p>You must not:</p>
                <ul>
                  <li>Republish material from Kontrola</li>
                  <li>Sell, rent or sub-license material from Kontrola</li>
                  <li>Reproduce, duplicate or copy material from Kontrola</li>
                  <li>Redistribute content from Kontrola</li>
                </ul>
            </section>
            
            <Separator />

            <section>
                <h2 className="font-semibold text-xl">2. Payments and Subscriptions</h2>
                <p>
                    Kontrola uses **Paystack** as its third-party payment processor. By subscribing to any paid plan or making a transaction, you agree to be bound by Paystack's Terms of Service. Kontrola does not store your credit card or mobile money details on our servers. All financial transactions are subject to the policies of the relevant financial institution and payment aggregator.
                </p>
                <p>
                    **Refunds:** Subscription fees are generally non-refundable except where required by law. You may cancel your subscription at any time within your account settings.
                </p>
            </section>
            
            <Separator />

            <section>
                <h2 className="font-semibold text-xl">3. User Accounts & Content</h2>
                <p>
                    When you create an account with us, you must provide us information that is accurate, complete, and current at all times. You are responsible for safeguarding the credentials used to access the Service.
                </p>
                <p>
                    **Data Ownership:** You retain all rights to the financial data and content you input into the App. By using the Service, you grant Kontrola a license to process this data solely for the purpose of providing the App's features and AI-driven insights to you.
                </p>
            </section>
            
            <Separator />
            
             <section>
                <h2 className="font-semibold text-xl">3. Limitation of Liability</h2>
                <p>
                    In no event shall Kontrola, nor any of its officers, directors and employees, be held liable for anything arising out of or in any way connected with your use of this application whether such liability is under contract. Kontrola, including its officers, directors and employees shall not be held liable for any indirect, consequential or special liability arising out of or in any way related to your use of this application. The financial guidance provided by our AI is for informational purposes only and not a substitute for professional financial advice.
                </p>
            </section>

            <Separator />

            <section>
              <h2 className="font-semibold text-xl">4. Governing Law</h2>
              <p>
                These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which the company is based, without regard to its conflict of law provisions.
              </p>
            </section>
            
            <Separator />
            
             <section>
                <h2 className="font-semibold text-xl">5. Changes to These Terms</h2>
                <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will notify you of any changes by posting the new Terms of Service within the application. Your continued use of the App after such modifications will constitute your acknowledgment of the modified Terms.</p>
            </section>

            <Separator />

            <section>
              <h2 className="font-semibold text-xl">6. Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact
                us at:
                <div className="flex flex-col gap-1 pt-2">
                  <a href="mailto:support@kontrolaapp.com" className="text-primary hover:underline font-bold">
                    support@kontrolaapp.com
                  </a>
                  <a href="tel:+233501705890" className="text-primary hover:underline font-bold">
                    +233 501 705 890
                  </a>
                </div>
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
