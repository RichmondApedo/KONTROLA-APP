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
              Welcome to Kontrola! These Terms of Service govern your use of the Kontrola application and services. By
              accessing or using the app, you confirm that you have read, understood, and agree to be bound by these
              terms. Do not use Kontrola if you do not agree.
            </p>

            <Separator />

            {/* 1 */}
            <section>
              <h2 className="font-semibold text-xl">1. License to Use</h2>
              <p>
                Unless otherwise stated, Kontrola and/or its licensors own all intellectual property rights in the
                application. All rights are reserved. You are granted a limited, non-exclusive, non-transferable licence
                to use the app for personal or business financial management purposes.
              </p>
              <p>You must not:</p>
              <ul>
                <li>Republish, sell, rent, or sub-license material from Kontrola</li>
                <li>Reproduce, duplicate, or copy material from Kontrola for commercial purposes</li>
                <li>Redistribute content from Kontrola without written permission</li>
                <li>Attempt to reverse-engineer any part of the application</li>
              </ul>
            </section>

            <Separator />

            {/* 2 */}
            <section>
              <h2 className="font-semibold text-xl">2. Subscriptions &amp; Billing</h2>

              <h3 className="font-semibold text-base mt-4">2.1 Subscription Plans</h3>
              <p>
                Kontrola offers a free tier and paid subscription plans (Premium and Pro Plus). Paid plans unlock
                additional features as described on the pricing page. All prices are displayed in Ghanaian Cedis (GHS)
                and are inclusive of applicable taxes where required by law.
              </p>

              <h3 className="font-semibold text-base mt-4">2.2 Automatic Renewal — IMPORTANT</h3>
              <p>
                <strong>
                  Paid subscriptions automatically renew every 30 days unless cancelled before the renewal date.
                </strong>{' '}
                By subscribing, you expressly authorise Kontrola and its payment processor, Paystack, to charge your
                selected payment method the applicable fee every 30 days starting from your initial purchase date,
                until you cancel. You will be notified of each upcoming renewal charge.
              </p>

              <h3 className="font-semibold text-base mt-4">2.3 Current Pricing</h3>
              <ul>
                <li>
                  <strong>Premium:</strong> GHS 25.00 billed every 30 days
                </li>
                <li>
                  <strong>Pro Plus:</strong> GHS 50.00 billed every 30 days
                </li>
              </ul>
              <p>
                Kontrola reserves the right to modify subscription pricing with at least 30 days&apos; advance notice
                provided via in-app notification or email. Continued use after the effective date of a price change
                constitutes your acceptance of the new price.
              </p>

              <h3 className="font-semibold text-base mt-4">2.4 Payment Processing</h3>
              <p>
                All payments are processed securely by <strong>Paystack</strong>, a licensed payment service provider.
                Kontrola does not store your card number, mobile money PIN, OTP, or any other sensitive payment
                credential on its servers. By completing a purchase you also agree to{' '}
                <a
                  href="https://paystack.com/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Paystack&apos;s Terms of Service
                </a>
                .
              </p>

              <h3 className="font-semibold text-base mt-4">2.5 How to Cancel</h3>
              <p>
                You may cancel your subscription at any time:
              </p>
              <ol>
                <li>Open the Kontrola app or visit kontrolaapp.com</li>
                <li>Go to <strong>Dashboard → Settings → Subscription</strong></li>
                <li>Tap <strong>&quot;Cancel Subscription&quot;</strong> and confirm</li>
              </ol>
              <p>
                Cancellation takes effect immediately — no further charges will be made. You will retain full access to
                your paid plan&apos;s features until the end of the current 30-day billing period, after which your
                account reverts to the Free plan. Cancellation must be completed at least 24 hours before your next
                renewal date to avoid that cycle&apos;s charge.
              </p>

              <h3 className="font-semibold text-base mt-4">2.6 Refund Policy</h3>
              <p>
                Subscription fees are <strong>non-refundable</strong> except where required by applicable law
                (including Ghana&apos;s Electronic Transactions Act, 2008 — Act 772). If you believe you have been
                charged in error or wish to dispute a charge, please contact us within 7 days of the transaction at{' '}
                <a href="mailto:support@kontrolaapp.com" className="text-primary underline">
                  support@kontrolaapp.com
                </a>
                . We will investigate and respond within 5 business days.
              </p>

              <h3 className="font-semibold text-base mt-4">2.7 Free Trials</h3>
              <p>
                Where a free trial is offered, the trial period will be clearly stated before you begin. At the end of
                the trial, your subscription will automatically convert to the paid plan unless you cancel before the
                trial expires. No charge is made during the trial period.
              </p>

              <h3 className="font-semibold text-base mt-4">2.8 Mobile App — Apple &amp; Android Users</h3>
              <p>
                If you use Kontrola via the iOS or Android app, subscriptions are purchased and managed through
                Kontrola&apos;s website (kontrolaapp.com) and are not processed through Apple&apos;s App Store or
                Google Play in-app purchase systems. To manage or cancel your subscription, visit{' '}
                <strong>Dashboard → Settings → Subscription</strong> in the app or at kontrolaapp.com.{' '}
                <strong>Apple Inc. is not a party to these Terms</strong> and bears no responsibility for Kontrola or
                its content.
              </p>
            </section>

            <Separator />

            {/* 3 */}
            <section>
              <h2 className="font-semibold text-xl">3. User Accounts &amp; Content</h2>
              <p>
                When you create an account, you must provide accurate, complete, and current information. You are
                responsible for safeguarding your login credentials and for all activity that occurs under your account.
              </p>
              <p>
                <strong>Data Ownership:</strong> You retain all rights to the financial data and content you input into
                the app. By using the Service, you grant Kontrola a limited licence to process this data solely to
                provide the app&apos;s features and AI-driven insights to you.
              </p>
            </section>

            <Separator />

            {/* 4 */}
            <section>
              <h2 className="font-semibold text-xl">4. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, Kontrola and its officers, directors, and employees shall not
                be liable for any indirect, consequential, or special liability arising from your use of the
                application. The financial guidance provided by our AI is for informational purposes only and does not
                constitute professional financial, legal, or tax advice.
              </p>
            </section>

            <Separator />

            {/* 5 */}
            <section>
              <h2 className="font-semibold text-xl">5. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the Republic of Ghana, including the Electronic Transactions
                Act, 2008 (Act 772) and the Data Protection Act, 2012 (Act 843), without regard to conflict-of-law
                provisions.
              </p>
            </section>

            <Separator />

            {/* 6 */}
            <section>
              <h2 className="font-semibold text-xl">6. Changes to These Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. Material changes will be notified at least 30
                days in advance via in-app notification or email. Continued use of the app after the effective date
                constitutes your acceptance of the updated Terms.
              </p>
            </section>

            <Separator />

            {/* 7 */}
            <section>
              <h2 className="font-semibold text-xl">7. Contact Us</h2>
              <p>
                For billing disputes, cancellation help, or any other enquiries about these Terms, contact us at:
              </p>
              <div className="flex flex-col gap-1 pt-2">
                <a href="mailto:support@kontrolaapp.com" className="text-primary hover:underline font-bold">
                  support@kontrolaapp.com
                </a>
                <a href="tel:+233501705890" className="text-primary hover:underline font-bold">
                  +233 501 705 890
                </a>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
