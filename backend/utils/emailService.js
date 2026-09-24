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
    from: `"MI-KRO Orders" <${smtpUser}>`,
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
        <p><strong>MI-KRO Operations Team</strong></p>
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

// Email function for pending orders
export const sendPendingOrderEmail = async (customerEmail, recipientName, orderNumber, subtotal) => {
  if (!smtpPass) {
    throw new Error('SMTP_PASS is completely missing or empty in your backend .env file.');
  }

  const mailOptions = {
    from: `"MI-KRO Orders" <${smtpUser}>`,
    to: customerEmail,
    subject: `Order Confirmation - Pending Approval (#${orderNumber})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; color: #334155;">
        <h2>Order Received & Pending Review</h2>
        <p>Hello ${recipientName || 'Customer'},</p>
        <p>Your order <strong>#${orderNumber}</strong> has been received by our system.</p>
        <p>Because it triggered an administrative limit, it is currently marked as "Pending" and is awaiting manual approval.</p>
        <p><strong>Order Subtotal:</strong> $${subtotal || 0}</p>
        <br/>
        <p>We will notify you once your order is approved and moving to fulfillment.</p>
        <p>Best Regards,</p>
        <p><strong>MI-KRO Operations Team</strong></p>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
};

// NEW: Email function for successful/standard order placements
export const sendOrderConfirmationEmail = async (customerEmail, orderData) => {
  if (!smtpPass) {
    throw new Error('SMTP_PASS is completely missing or empty in your backend .env file.');
  }

  // Safely format the shipping address
  const shipTo = orderData.shippingAddress ? `
    ${orderData.shippingAddress.recipientName || ''}<br/>
    ${orderData.shippingAddress.companyName ? orderData.shippingAddress.companyName + '<br/>' : ''}
    ${orderData.shippingAddress.street1 || ''} ${orderData.shippingAddress.street2 || ''}<br/>
    ${orderData.shippingAddress.city || ''}, ${orderData.shippingAddress.state || ''} ${orderData.shippingAddress.zipCode || ''}<br/>
    ${orderData.shippingAddress.country || 'US'}
  ` : 'Address Not Provided';

  // Format the date (fallback to current date if createdAt is missing)
  const orderDate = orderData.createdAt ? new Date(orderData.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Build the line items table rows dynamically
  const itemsHtml = orderData.items && orderData.items.length > 0 
    ? orderData.items.map(item => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: left;">
            <strong>${item.name || item.description || 'Item'}</strong><br/>
            <span style="font-size: 12px; color: #64748b;">SKU: ${item.sku || 'N/A'}</span>
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity || 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${Number(item.unitPrice || 0).toFixed(2)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">$${Number(item.totalPrice || 0).toFixed(2)}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="4" style="padding: 10px; text-align: center;">No items found in this order.</td></tr>`;

  // Build the HTML email template
  const mailOptions = {
    from: `"MI-KRO Orders" <${smtpUser}>`,
    to: customerEmail,
    subject: `Order Confirmation - #${orderData.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #334155; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        
        <!-- Header -->
        <div style="background-color: #0f172a; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">Order Confirmation</h2>
          <p style="margin: 5px 0 0 0; color: #94a3b8;">Order #${orderData.orderNumber}</p>
        </div>

        <!-- Body -->
        <div style="padding: 20px;">
          <p>Hello ${orderData.shippingAddress?.recipientName || 'Customer'},</p>
          <p>Thank you for your order! We've received it and are currently processing it for fulfillment.</p>
          
          <!-- Order Meta Data -->
          <table style="width: 100%; margin-top: 20px; margin-bottom: 20px; font-size: 14px;">
            <tr>
              <td style="vertical-align: top; width: 50%;">
                <h4 style="margin: 0 0 5px 0; color: #0f172a uppercase; font-size: 12px; color: #64748b;">Ship To:</h4>
                <p style="margin: 0; line-height: 1.5;">${shipTo}</p>
              </td>
              <td style="vertical-align: top; width: 50%; text-align: right;">
                <h4 style="margin: 0 0 5px 0; color: #0f172a uppercase; font-size: 12px; color: #64748b;">Order Details:</h4>
                <p style="margin: 0; line-height: 1.5;">
                  <strong>Date:</strong> ${orderDate}<br/>
                  <strong>Carrier:</strong> ${orderData.shippingDetails?.carrierType || 'Standard'}<br/>
                  <strong>Service:</strong> ${orderData.shippingDetails?.serviceCode || 'Standard'}
                </p>
              </td>
            </tr>
          </table>

          <!-- Line Items Table -->
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; text-align: left;">Item Details</th>
                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; text-align: center;">Qty</th>
                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; text-align: right;">Price</th>
                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Subtotal:</td>
                <td style="padding: 10px; text-align: right;">$${Number(orderData.subtotal || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Processing Fees:</td>
                <td style="padding: 10px; text-align: right;">$${Number(orderData.processingFees?.totalProcessingFee || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold; font-size: 16px; border-top: 2px solid #e2e8f0;">Grand Total:</td>
                <td style="padding: 10px; text-align: right; font-weight: bold; font-size: 16px; border-top: 2px solid #e2e8f0;">$${Number(orderData.totalAmount || 0).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <p style="font-size: 14px; text-align: center; color: #64748b; margin-top: 30px;">
            If you have any questions regarding your order, please contact our support team.
          </p>
        </div>
      </div>
    `
  };

  return await transporter.sendMail(mailOptions);
};