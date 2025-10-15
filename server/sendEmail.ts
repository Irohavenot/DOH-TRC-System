// server/sendEmail.ts
import dotenv from "dotenv";
import { Resend } from "resend";
import { render } from "@react-email/components";
import * as React from "react"; // ✅ always import React like this
import SlackConfirmEmail from "../src/components/emails/temp_password.tsx"; // ✅ explicit .tsx extension

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendApprovalEmail(to: string, tempPassword: string) {
  try {
    // ✅ Render React email component to HTML
    const html = await render(
      React.createElement(SlackConfirmEmail, { validationCode: tempPassword })
    );

    // ✅ Send via Resend
    const data = await resend.emails.send({
      from: "onboarding@resend.dev",
      to,  
      subject: "Your DOH Account Temporary Password",
      html,
    });

    console.log("✅ Email sent:", data);
    return data;
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    throw error;
  }
}
