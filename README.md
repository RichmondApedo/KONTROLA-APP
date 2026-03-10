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

## How It Functions

KONTROLA is built with a modern tech stack to deliver a fast, secure, and reliable user experience.

### Generative AI Setup

The application's AI features (AI Advisor, category suggestions, etc.) are powered by Google's Gemini models through Genkit. To enable these features, you must provide an API key.

1.  **Get an API Key**: Visit [Google AI Studio](https://aistudio.google.com/app/apikey) to get your free API key.
2.  **Set the Environment Variable**: Create a file named `.env` in the root of the project (if it doesn't already exist) and add the following line, replacing `<your_api_key_here>` with the key you just obtained:

    ```
    GEMINI_API_KEY="<your_api_key_here>"
    ```

3.  **Restart the Development Server**: If your server was running, stop it and restart it (`npm run dev`) to load the new environment variable. The AI features should now be active.

- **Frontend**: The user interface is built with **Next.js** and **React**, utilizing the App Router for optimized routing and Server Components for improved performance. The UI components are from the **ShadCN UI** library, styled with **Tailwind CSS**.
- **Backend & Database**: All user data, including profiles, transactions, and business data, is securely managed by **Firebase**. **Firebase Authentication** handles user sign-in, and **Firestore** serves as the real-time NoSQL database.
- **Generative AI**: The AI Financial Advisor feature is powered by **Google's Genkit**, which orchestrates calls to large language models to generate personalized financial advice based on the user's data.
- **Account Linking**: Secure, read-only account linking is powered by **Mono**.
- **Payments**: Subscription payments are securely handled by **Paystack**.

The application follows a strict user-ownership data model, where all user information is segregated and protected by Firebase Security Rules, ensuring that users can only access their own financial data.

## Automated Tasks (Cron Jobs)

KONTROLA uses automated tasks to send reminders and notifications for bills, budgets, and savings goals. These tasks are handled by a secure API endpoint that should be called periodically by a cron job scheduler.

### Setup

1.  **Set the Cron Secret**: In your production environment, set an environment variable called `CRON_SECRET`. This should be a long, random, and secret string. This secret acts as a password to prevent unauthorized users from running the automated tasks.

    Example `.env.local` or environment variable setting:
    ```
    CRON_SECRET="your_super_secret_and_random_string_here"
    ```

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
          "path": "/api/cron/run-checks?secret=your_super_secret_and_random_string_here",
          "schedule": "0 0 * * *"
        }
      ]
    }
    ```

### Important Notes

-   **Execution Timeout**: These automated tasks, especially those involving AI, may take longer than the default timeout of your hosting provider (e.g., 10-15 seconds on Vercel's Hobby plan). Ensure your hosting plan supports longer execution times for serverless functions if you encounter timeouts.
-   **Security**: Always use a strong, unique `CRON_SECRET` and keep it secure.
