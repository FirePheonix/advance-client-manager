import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getClients } from "@/lib/database";
import type { Client } from "@/lib/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    // Get all clients
    const clients = await getClients();
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    // Filter clients with payments due exactly tomorrow
    const clientsDueTomorrow = clients.filter(client => {
      if (!client.next_payment) return false;
      const dueDate = new Date(client.next_payment);
      
      // Check if due date is tomorrow (ignoring time)
      return (
        dueDate.getDate() === tomorrow.getDate() &&
        dueDate.getMonth() === tomorrow.getMonth() &&
        dueDate.getFullYear() === tomorrow.getFullYear()
      );
    });

    // Send emails to each client
    const emailResults = await Promise.all(
      clientsDueTomorrow.map(async (client) => {
        const dueDate = new Date(client.next_payment!);
        const amount = client.payment_type === "monthly" 
          ? client.monthly_rate 
          : client.payment_type === "weekly" 
            ? client.weekly_rate 
            : 0;

        try {
          const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: client.email,
            subject: 'Payment Due Tomorrow',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #333;">Hello ${client.name},</h1>
                <p>This is a reminder that your payment is due tomorrow.</p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="margin-top: 0;">Payment Details</h2>
                  <p><strong>Amount:</strong> ₹${amount}</p>
                  <p><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
                </div>
                
                <p>Please ensure the payment is made by end of day tomorrow.</p>
                <p>Thank you for your business!</p>
                
                <p style="margin-top: 30px; color: #666;">Best regards,<br>Your Agency Team</p>
              </div>
            `
          });

          return {
            clientId: client.id,
            clientEmail: client.email,
            success: !error,
            error: error || null
          };
        } catch (error) {
          return {
            clientId: client.id,
            clientEmail: client.email,
            success: false,
            error: error
          };
        }
      })
    );

    // Count successful and failed emails
    const successfulEmails = emailResults.filter(result => result.success);
    const failedEmails = emailResults.filter(result => !result.success);

    return NextResponse.json({
      message: "Payment reminder emails processed",
      totalClients: clientsDueTomorrow.length,
      emailsSent: successfulEmails.length,
      emailsFailed: failedEmails.length,
      failedEmails: failedEmails.map(e => ({
        clientId: e.clientId,
        email: e.clientEmail,
        error: e.error
      }))
    });

  } catch (error) {
    console.error("Error in payment reminder route:", error);
    return NextResponse.json({
      error: "An error occurred while processing payment reminders."
    }, { status: 500 });
  }
}