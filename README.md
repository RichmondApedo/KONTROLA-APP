# KONTROLA - AI-Powered Financial Management

KONTROLA is a modern, responsive, and intelligent web application designed to provide users with clear insights and powerful tools to manage their personal and business finances. It features a clean interface for tracking income and expenses, personalized financial advice through an AI-powered advisor, and beautiful data visualizations to help users achieve their financial goals.

## Core Features

- **Secure Authentication**: Multi-method sign-in using Email/Password, Google, and Apple.
- **Interactive Dashboard**: At-a-glance overview of balance, monthly cash flow, and savings progress.
- **Income & Expense Tracking**: Real-time management of transactions for both personal and business accounts.
- **Account Sync**: Secure, read-only linking of bank or mobile money accounts via Mono.
- **AI Financial Advisor**: Personalized financial insights and long-term forecasts powered by Google's Gemini models.
- **Budgets & Goals**: Smart budget management and motivational savings goal tracking.
- **Bill Tracking**: Integrated bill reminders and push notifications to ensure timely payments.
- **Reports & Analytics**: Advanced interactive charts and data exporting (PDF/Excel).
- **Business Suite**: Dedicated CRM and professional invoicing/receipt generation for business owners.
- **Responsive PWA**: Seamless experience across mobile and desktop devices.

## Tech Stack

- **Frontend**: Next.js (App Router), React, Tailwind CSS, ShadCN UI.
- **Backend**: Firebase (Authentication, Firestore, Cloud Messaging).
- **AI & Logic**: Google Gemini via Genkit.
- **Integrations**: Mono (Banking), Paystack (Payments).

## Getting Started

To run the application locally or prepare for deployment, follow these steps:

1.  **Configure Environment Variables**:
    Create a `.env` file in the root directory. Use [.env.example](file:///.env.example) as a template and fill in your API keys for Firebase, Gemini, Mono, and Paystack.

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## Automated Tasks (Cron Jobs)

KONTROLA uses automated periodic tasks (via `/api/cron/run-checks`) to handle bill reminders, budget alerts, and savings notifications. 

- **Security**: Access is protected by a `CRON_SECRET` environment variable.
- **Scheduling**: Can be triggered by [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) or any standard scheduler using the endpoint:
  `https://your-domain.com/api/cron/run-checks?secret=YOUR_CRON_SECRET`

---

For detailed store deployment instructions, please refer to the [Store Deployment Guide](file:///STORE_DEPLOYMENT_GUIDE.md).
