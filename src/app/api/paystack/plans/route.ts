import { NextResponse } from "next/server";

export async function GET() {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey || secretKey === 'your_paystack_secret_key_here') {
      return NextResponse.json({ error: "Paystack secret key not configured on the server." }, { status: 500 });
    }

    const response = await fetch("https://api.paystack.co/plan", {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch plans from Paystack');
    }

    const data = await response.json();

    return NextResponse.json(data.data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch plans" }, { status: 500 });
  }
}
