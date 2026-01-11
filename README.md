# KONTROLA - AI-Powered Financial Management

KONTROLA is a modern, responsive, and intelligent web application designed to help users take control of their personal finances. It provides a clean interface for tracking income and expenses, offers personalized financial advice through an AI-powered advisor, and visualizes financial data to help users understand their spending habits and achieve their financial goals.

## Core Features

- **Secure Authentication**: Sign up and log in securely using various methods, including Email/Password, Google, Apple, and modern, passwordless Passkeys.
- **Interactive Dashboard**: Get an at-a-glance overview of your financial health, including total balance, monthly income and expenses, and progress towards savings goals.
- **Income & Expense Tracking**: Easily add, view, and categorize your income sources and expenses. All transactions are saved in real-time.
- **AI Financial Advisor**: Leverage the power of generative AI to analyze your financial data and receive personalized insights and actionable recommendations to improve your financial habits.
- **Reports & Analytics**: Visualize your financial data with interactive charts, including income vs. expense trends and breakdowns of spending by category.
- **Personalized Settings**: Customize your experience by setting your preferred display language and currency.
- **Responsive Design**: Access and manage your finances seamlessly on any device, from desktop to mobile.

## How It Functions

KONTROLA is built with a modern tech stack to deliver a fast, secure, and reliable user experience.

- **Frontend**: The user interface is built with **Next.js** and **React**, utilizing the App Router for optimized routing and Server Components for improved performance. The UI components are from the **ShadCN UI** library, styled with **Tailwind CSS**.
- **Backend & Database**: All user data, including profiles, income, and expenses, is securely managed by **Firebase**. **Firebase Authentication** handles user sign-in, and **Firestore** serves as the real-time NoSQL database.
- **Generative AI**: The AI Financial Advisor feature is powered by **Google's Genkit**, which orchestrates calls to large language models to generate personalized financial advice based on the user's data.

The application follows a strict user-ownership data model, where all user information is segregated and protected by Firebase Security Rules, ensuring that users can only access their own financial data.
