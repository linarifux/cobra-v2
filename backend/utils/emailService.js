import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();


// 1. Extract and AGGRESSIVELY CLEAN variables
const smtpUser = process.env.SMTP_USER?.replace(/['"]/g, '').trim() || 'orders@mi-kro.com';
const smtpPass = process.env.SMTP_PASS?.replace(/['"]/g, '').trim();


const transporter = nodemailer.createTransport({
  host: 'netsol-smtp-oxcs.hostingplatform.com',
  port: 587,
  secure: false, // Must be false for port 587 (STARTTLS)
  auth: {
    user: smtpUser,
    pass: smtpPass 
  }
});

export const sendReceivingConfirmationEmail = async (customerEmail, receivingId, pdfBuffer) => {
  
  // 2. Safeguard: Hard crash with a clear message if the password is missing
  if (!smtpPass) {
    throw new Error('SMTP_PASS is completely missing or empty in your backend .env file.');
  }

  const mailOptions = {
    from: `"Mi-Kro Orders" <${smtpUser}>`,
    to: customerEmail,
    subject: `Receiving Confirmation - Receipt #${receivingId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; color: #334155;">
        <h2>Inbound Shipment Received</h2>
        <p>Hello,</p>
        <p>Your inbound cargo record has been successfully verified and added to our system under Receipt ID: <strong>${receivingId}</strong>.</p>
        <p>Please find the official receiving breakdown document attached as a PDF file for your internal records.</p>
        <br/>
        <p>Best Regards,</p>
        <p><strong>Mi-Kro Operations Team</strong></p>
      </div>
    `,
    attachments: [
      {
        filename: `Receiving_Receipt_${receivingId}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  return await transporter.sendMail(mailOptions);
};