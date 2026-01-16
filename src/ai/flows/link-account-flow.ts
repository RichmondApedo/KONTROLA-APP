'use server';
/**
 * @fileOverview This feature is temporarily disabled due to package resolution issues.
 */

export function exchangeTokenForAccount(input: any): Promise<any> {
    console.error("Attempted to call a disabled feature: exchangeTokenForAccount");
    return Promise.resolve({ success: false, message: "Account linking is temporarily disabled." });
}

export type ExchangeTokenInput = {};
export type ExchangeTokenOutput = {};
