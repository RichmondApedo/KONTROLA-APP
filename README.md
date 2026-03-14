# KONTROLA - AI-Powered Financial Management

KONTROLA is a modern, responsive, and intelligent web application designed to provide users with clear insights and powerful tools to manage their personal and business finances. It provides a clean interface for tracking income and expenses, offers personalized financial advice through an AI-powered advisor, and visualizes financial data to help users understand their spending habits and achieve their financial goals.

## Core Features

- **Secure Authentication**: Sign up and log in securely using Email/Password, Google, and Apple.
- **Interactive Dashboard**: Get an at-a-glance overview of your financial health, including total balance, monthly income and expenses, and progress towards savings goals.
- **Income & Expense Tracking**: Easily add, view, and categorize your income sources and expenses, for both personal and business accounts. All transactions are saved in real-time.
- **Account Sync**: Securely link your bank or mobile money accounts to automatically sync your transactions in read-only mode.
- **AI Financial Advisor**: Leverage generative AI to analyze your financial data and receive personalized insights (Free), or run advanced, long-term forecasts (Pro Plus).
- **Budgets & Goals (Premium)**: Create budgets to manage spending and set savings goals to stay motivated.
- **Bill Tracking (Premium)**: Track upcoming bills and get push notification reminders so you never miss a payment.
- **Reports & Analytics**: Visualize your financial data with interactive charts. Export detailed reports to PDF and Excel (Premium).
- **Business Suite (Pro Plus)**: Manage your business finances with a dedicated dashboard, customer management (CRM), and professional invoicing and receipt generation.
- **Personalized Settings**: Customize your experience by setting your preferred display language and currency.
- **Responsive Design**: Access and manage your finances seamlessly on any device, from desktop to mobile.

## Tech Stack

- **Frontend**: The user interface is built with **Next.js** and **React**, utilizing the App Router for optimized routing and Server Components for improved performance. The UI components are from the **ShadCN UI** library, styled with **Tailwind CSS**.
- **Backend & Database**: All user data, including profiles, transactions, and business data, is securely managed by **Firebase**. **Firebase Authentication** handles user sign-in, and **Firestore** serves as the real-time NoSQL database.
- **Generative AI**: AI features are powered by **Google's Gemini models through Genkit**.
- **Account Linking**: Secure, read-only account linking is powered by **Mono**.
- **Payments**: Subscription payments are securely handled by **Paystack**.
- **Push Notifications**: Handled via **Firebase Cloud Messaging**.

## Setup for Deployment

To run this application in a local development or production environment, you must configure several services and set their corresponding API keys in a `.env` file at the root of the project.

Create a file named `.env` and add the following variables:

```
# --- Google Gemini API Key (for Genkit) ---
# This key powers all AI features like the financial advisor.
# Get your Gemini API Key from Google AI Studio: https://aistudio.google.com/app/apikey
GEMINI_API_KEY="<your_gemini_api_key>"

# --- Firebase Admin (for Server-Side Functions) ---
# Required for cron jobs (bill reminders, etc.) and server-side logic.
# 1. Go to your Firebase Project Settings > Service accounts.
# 2. Click "Generate new private key". A JSON file will be downloaded.
# 3. Copy the entire contents of the JSON file and paste it here as a single line string.
# IMPORTANT: This key is highly sensitive. Do not commit it to version control.
FIREBASE_SERVICE_ACCOUNT='{"type": "service_account", "project_id": "...", ...}'

# --- Firebase Cloud Messaging (for Push Notifications) ---
# Required for sending push notifications for bill and budget alerts.
# 1. In your Firebase Project, go to Project Settings > Cloud Messaging.
# 2. Under "Web configuration", find or generate a "Web Push certificate" key pair.
# 3. Copy the public key here.
NEXT_PUBLIC_FIREBASE_VAPID_KEY="<your_firebase_messaging_vapid_key>"

# --- Paystack (for Subscription Payments) ---
# Get your keys from the Paystack Dashboard: https://dashboard.paystack.com/#/settings/developer
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="<your_paystack_public_key>"
PAYSTACK_SECRET_KEY="<your_paystack_secret_key>"

# --- Mono (for Bank Account Linking) ---
# Get your keys from the Mono Dashboard: https://app.withmono.com/apps
NEXT_PUBLIC_MONO_PUBLIC_KEY="<your_mono_public_key>"
MONO_SECRET_KEY="<your_mono_secret_key>"

# --- Cron Job Security ---
# A secret key to prevent unauthorized execution of scheduled tasks.
# Can be any long, random string.
CRON_SECRET="your_super_secret_and_random_string_here"
```

## Automated Tasks (Cron Jobs)

KONTROLA uses automated tasks to send reminders and notifications for bills, budgets, and savings goals. These tasks are handled by a secure API endpoint that should be called periodically by a cron job scheduler.

### Setup

1.  **Set the Cron Secret**: Ensure the `CRON_SECRET` environment variable is set as described in the "Setup for Deployment" section. This secret acts as a password to prevent unauthorized users from running the automated tasks.

2.  **Configure the Cron Job**: Use a scheduling service like [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs), [GitHub Actions](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule), or a third-party service like [EasyCron](https://www.easycron.com/) to send a `POST` request to the following URL once a day (e.g., at midnight):

    ```
    https://<your-app-domain>.com/api/cron/run-checks?secret=<your_cron_secret>
    ```

    Replace `<your-app-domain>` with your application's domain and `<your_cron_secret>` with the secret you defined in the environment variable.

    **Example Vercel Cron Job Configuration (`vercel.json`):**
    ```json
    {
      "crons": [
        {
          "path": "/api/cron/run-checks?secret=${CRON_SECRET}",
          "schedule": "0 0 * * *"
        }
      ]
    }
    ```
    When you deploy to Vercel with this `vercel.json` file, it will automatically use the `CRON_SECRET` value from your project's environment variables.

### Important Notes

-   **Execution Timeout**: These automated tasks, especially those involving AI, may take longer than the default timeout of your hosting provider (e.g., 10-15 seconds on Vercel's Hobby plan). Ensure your hosting plan supports longer execution times for serverless functions if you encounter timeouts.
-   **Security**: Always use a strong, unique `CRON_SECRET` and keep it secure.
