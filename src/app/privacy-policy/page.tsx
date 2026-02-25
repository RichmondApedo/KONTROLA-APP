
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function PrivacyPolicyPage() {
  const effectiveDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="bg-background text-foreground min-h-screen py-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-extrabold tracking-tight text-primary">
              Privacy Policy for KONTROLA
            </CardTitle>
            <p className="text-muted-foreground">Effective Date: {effectiveDate}</p>
          </CardHeader>
          <CardContent className="prose prose-sm sm:prose-base dark:prose-invert max-w-none space-y-6">
            <p>
              Kontrola (“we”, “our”, or “us”) is committed to protecting and
              respecting your privacy. This Privacy Policy explains how we
              collect, use, disclose, and safeguard your information when you use
              our mobile application and related services (collectively, the
              “App”). Please read this policy carefully to understand our views
              and practices regarding your personal data and how we will treat
              it.
            </p>

            <Separator />

            <section>
              <h2 className="font-semibold text-xl">1. Information We Collect</h2>
              <p>
                We may collect and process the following types of information:
              </p>
              <div className="space-y-2 pl-4">
                <h3 className="font-semibold">a. Personal Information You Provide</h3>
                <p>
                  This is information you voluntarily give us when you register for
                  and use the App. It includes:
                </p>
                <ul>
                  <li>
                    <strong>Identity & Contact Data:</strong> Your full name and email
                    address.
                  </li>
                  <li>
                    <strong>Profile Data:</strong> Your business name, preferred language, currency,
                    and other settings.
                  </li>
                </ul>
                <h3 className="font-semibold">b. Financial Information</h3>
                <p>
                  This is financial data you manually enter or that is synced
                  from a linked account:
                </p>
                <ul>
                  <li>
                    Income records, expense records, and budget details.
                  </li>
                  <li>
                    Transaction details, categories, descriptions, and dates.
                  </li>
                  <li>
                    Savings goals and bill payment information.
                  </li>
                   <li>
                    <strong>Business-related Data:</strong> Information you provide about your customers (e.g., name, email, phone, address) and the details of invoices you create for them.
                  </li>
                </ul>
                <p className="font-bold text-amber-600 dark:text-amber-500">
                  ⚠️ Important: Kontrola never receives or stores your bank login
                  credentials (username/password) or mobile money PINs. All
                  connections are handled securely by our trusted third-party
                  aggregator, Mono.
                </p>
                <h3 className="font-semibold">c. Information We Collect Automatically</h3>
                <ul>
                  <li>
                    <strong>Usage Data:</strong> Information about how you use our App,
                    such as features used and pages viewed.
                  </li>
                  <li>
                    <strong>Notification Tokens:</strong> If you enable push notifications, we collect a Firebase Cloud Messaging (FCM) token to send you alerts. This token does not reveal any personal information about you.
                  </li>
                   <li>
                    <strong>Performance Data:</strong> Crash logs and other diagnostic
                    data to help us identify and fix issues.
                  </li>
                </ul>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="font-semibold text-xl">2. How We Use Your Information</h2>
              <p>
                We use the information we collect for various purposes, including:
              </p>
              <ul>
                <li>
                  To provide, operate, and maintain the core functionalities of
                  the App, such as budgeting and expense tracking.
                </li>
                <li>
                  To provide business management tools, including customer tracking and invoicing.
                </li>
                <li>
                  To generate personalized financial insights, forecasts, and
                  reports for you using our AI features.
                </li>
                 <li>
                  To send you push notifications for bill reminders and budget alerts, if you have opted-in to this feature.
                </li>
                <li>
                  To process transactions, manage your account, and send you
                  important service-related communications.
                </li>
                <li>
                  To improve the performance, user experience, and features of our
                  App through analysis of usage data.
                </li>
                <li>
                  To prevent fraud, enhance the security of our App, and enforce
                  our terms of service.
                </li>
                <li>
                  To comply with our legal and regulatory obligations.
                </li>
              </ul>
            </section>
            
            <Separator />

            <section>
              <h2 className="font-semibold text-xl">3. AI Financial Guidance Disclaimer</h2>
                <p>
                Kontrola may use artificial intelligence (AI) to provide automated
                financial insights, forecasts, suggestions, and recommendations based on the
                data you provide. These insights are generated by large language
                models and are for informational purposes only. They do not
                constitute professional financial, investment, tax, or legal
                advice. You should consult with a qualified professional before
                making any financial decisions.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="font-semibold text-xl">4. Data Sharing and Disclosure</h2>
              <p className="font-bold">We do not sell or rent your personal data to third parties.</p>
              <p>
                We may share your information only in the following limited
                circumstances:
              </p>
              <ul>
                <li>
                  <strong>Service Providers:</strong> With third-party vendors that
                  perform services for us, such as cloud hosting (Firebase -
                  Google), data analytics, and payment processing. These
                  providers are contractually obligated to protect your data and
                  are prohibited from using it for any other purpose.
                </li>
                <li>
                  <strong>Legal Compliance:</strong> If required by law, such as to
                  comply with a subpoena, or if we believe in good faith that
                  such action is necessary to comply with legal processes,
                  protect our rights, or investigate fraud.
                </li>
                <li>
                  <strong>Aggregated Data:</strong> We may share anonymized,
                  aggregated data that does not directly identify you for
                  statistical analysis or industry benchmarking.
                </li>
              </ul>
            </section>
            
            <Separator />

            <section>
                <h2 className="font-semibold text-xl">5. Data Security</h2>
                <p>
                    We are committed to protecting your data. We implement and maintain reasonable, industry-standard security measures to protect your information from unauthorized access, use, alteration, and disclosure. These measures include:
                </p>
                 <ul>
                    <li>Data encryption, both in transit (using TLS) and at rest.</li>
                    <li>Secure, token-based authentication methods.</li>
                    <li>Strict access controls within our organization.</li>
                    <li>Regular security assessments and updates.</li>
                </ul>
                <p>However, please be aware that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee its absolute security.</p>
            </section>
            
            <Separator />
            
             <section>
                <h2 className="font-semibold text-xl">6. Data Retention</h2>
                <p>We will only retain your personal data for as long as necessary to fulfill the purposes we collected it for, including for the purposes of satisfying any legal, accounting, or reporting requirements. Generally, this means we will retain your data for as long as you have an active account with us. Upon account deletion, your data will be permanently removed in accordance with our data deletion process, subject to any legal obligations to retain it for a longer period.</p>
            </section>

            <Separator />

            <section>
              <h2 className="font-semibold text-xl">7. User Control & Your Data Protection Rights</h2>
              <p>
                You have certain rights regarding the personal information we hold
                about you. You can:
              </p>
              <ul>
                <li>
                  <strong>Access, Update, or Correct</strong> your information at any
                  time through the App's settings.
                </li>
                <li>
                  <strong>Opt-out</strong> of push notifications by adjusting your
                  device settings or within the App.
                </li>
                <li>
                  <strong>Request Deletion</strong> of your account and all
                  associated personal data.
                </li>
              </ul>
              <p>
                To exercise any of these rights, including a request for data
                deletion, please contact us at:{' '}
                <a href="mailto:support@kontrolaapp.com" className="text-primary hover:underline">
                  support@kontrolaapp.com
                </a>
                .
              </p>
            </section>
            
            <Separator />

            <section>
                <h2 className="font-semibold text-xl">8. Children’s Privacy</h2>
                <p>The Kontrola App is not intended for or directed at individuals under the age of 18. We do not knowingly collect personal data from children. If we become aware that a child has provided us with personal information, we will take steps to delete such information.</p>
            </section>
            
            <Separator />
            
             <section>
                <h2 className="font-semibold text-xl">9. Changes to This Privacy Policy</h2>
                <p>We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by posting the new Privacy Policy within the App or by sending you an email. Your continued use of the App after such modifications will constitute your acknowledgment of the modified Policy.</p>
            </section>

            <Separator />

            <section>
              <h2 className="font-semibold text-xl">10. Contact Us</h2>
              <p>
                If you have any questions, concerns, or complaints about this
                Privacy Policy or our data-handling practices, please contact
                us at:{' '}
                <a href="mailto:support@kontrolaapp.com" className="text-primary hover:underline">
                  support@kontrolaapp.com
                </a>
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
