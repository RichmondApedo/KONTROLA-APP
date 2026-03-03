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

- **Frontend**: The user interface is built with **Next.js** and **React**, utilizing the App Router for optimized routing and Server Components for improved performance. The UI components are from the **ShadCN UI** library, styled with **Tailwind CSS**.
- **Backend & Database**: All user data, including profiles, transactions, and business data, is securely managed by **Firebase**. **Firebase Authentication** handles user sign-in, and **Firestore** serves as the real-time NoSQL database.
- **Generative AI**: The AI Financial Advisor feature is powered by **Google's Genkit**, which orchestrates calls to large language models to generate personalized financial advice based on the user's data.
- **Account Linking**: Secure, read-only account linking is powered by **Mono**.
- **Payments**: Subscription payments are securely handled by **Paystack**.

The application follows a strict user-ownership data model, where all user information is segregated and protected by Firebase Security Rules, ensuring that users can only access their own financial data.
