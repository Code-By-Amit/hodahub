import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'HodaHub <onboarding@resend.dev>';

function formatError(error) {
  if (!error) return null;
  if (typeof error === 'string') return error;
  return error.message || error.name || JSON.stringify(error);
}

/**
 * Send OTP Verification Email
 */
export async function sendOTPEmail(email, otp) {
  console.log(`[DEVELOPMENT OTP] Verification code for ${email}: ${otp}`);

  if (!resend) {
    return { success: true, mocked: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      subject: 'Verify your HodaHub account',
      html: `
        <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background-color: #ffffff; border-radius: 16px; border: 1px solid #f3f4f6;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="margin:0; color:#111827; font-size:26px; font-weight:800; tracking-tight: -0.5px;">Hoda<span style="color:#f97316;">Hub</span></h1>
          </div>
          <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin-bottom: 12px; text-align: center;">Verify Your Email</h2>
          <p style="color: #4b5563; font-size: 14px; line-height: 1.5; text-align: center; margin-bottom: 24px;">
            Enter the 6-digit verification code below to complete your HodaHub registration.
          </p>
          <div style="background-color: #fff7ed; border: 2px dashed #fdba74; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #ea580c;">${otp}</span>
          </div>
          <p style="color: #6b7280; font-size: 12px; text-align: center; margin-bottom: 24px;">
            This code will expire in 10 minutes. If you did not request this code, please ignore this email.
          </p>
          <div style="border-t: 1px solid #f3f4f6; padding-top: 16px; text-align: center;">
            <p style="margin:0; color:#9ca3af; font-size:12px;">&copy; ${new Date().getFullYear()} HodaHub. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Resend API error:', error);
      return { success: false, error: formatError(error) };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Failed to send OTP email:', err);
    return { success: false, error: formatError(err) };
  }
}

/**
 * Send Password Reset Email
 */
export async function sendPasswordResetEmail(email, otp) {
  console.log(`[DEVELOPMENT RESET OTP] Password reset code for ${email}: ${otp}`);

  if (!resend) return { success: true, mocked: true };

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      subject: 'Reset your HodaHub password',
      html: `
        <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background-color: #ffffff; border-radius: 16px; border: 1px solid #f3f4f6;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="margin:0; color:#111827; font-size:26px; font-weight:800;">Hoda<span style="color:#f97316;">Hub</span></h1>
          </div>
          <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin-bottom: 12px; text-align: center;">Password Reset Request</h2>
          <p style="color: #4b5563; font-size: 14px; line-height: 1.5; text-align: center; margin-bottom: 24px;">
            We received a request to reset your password. Use the code below to reset it:
          </p>
          <div style="background-color: #fff7ed; border: 2px dashed #fdba74; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #ea580c;">${otp}</span>
          </div>
          <p style="color: #6b7280; font-size: 12px; text-align: center; margin-bottom: 24px;">
            This code will expire in 10 minutes. If you did not request a password reset, please secure your account immediately.
          </p>
          <div style="border-t: 1px solid #f3f4f6; padding-top: 16px; text-align: center;">
            <p style="margin:0; color:#9ca3af; font-size:12px;">&copy; ${new Date().getFullYear()} HodaHub. All rights reserved.</p>
          </div>
        </div>
      `,
    });
    return { success: !error, data, error };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Send Order Confirmation Email
 */
export async function sendOrderConfirmationEmail(toEmail, order, items = [], address = null) {
  console.log(`[EMAIL] Order confirmation sent to ${toEmail} for Order #${order.id}`);

  if (!resend) return { success: true, mocked: true };

  try {
    const itemsListHtml = items
      .map((i) => {
        let addonsHtml = '';
        if (Array.isArray(i.addons) && i.addons.length > 0) {
          addonsHtml = i.addons
            .map((a) => {
              const aQty = a.quantity || 1;
              const aUnitPrice = Number(a.priceAtPurchase || 0);
              const aTotalPrice = aUnitPrice * aQty;
              return `<div style="font-size:12px; color:#6b7280; margin-top:2px;">+ ${a.name} × ${aQty} (${aUnitPrice === 0 ? 'Free' : `₹${aTotalPrice.toFixed(2)}`})</div>`;
            })
            .join('');
        }
        return `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 14px;">
            <div>${i.name || 'Product'} × ${i.quantity}</div>
            ${addonsHtml}
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 14px; text-align: right; font-weight: 600;">₹${(Number(i.priceAtPurchase || i.price) * i.quantity).toFixed(2)}</td>
        </tr>
      `;
      })
      .join('');

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [toEmail],
      subject: `Order Confirmation — #${order.id.slice(0, 8)}`,
      html: `
        <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background-color: #ffffff; border-radius: 16px; border: 1px solid #f3f4f6;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="margin:0; color:#111827; font-size:26px; font-weight:800;">Hoda<span style="color:#f97316;">Hub</span></h1>
          </div>
          <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin-bottom: 8px;">Order Placed Successfully!</h2>
          <p style="color: #4b5563; font-size: 14px; margin-bottom: 24px;">
            Thank you for your order! Your order <strong>#${order.id.slice(0, 8)}</strong> has been received and is being processed.
          </p>

          <div style="background-color: #f9fafb; padding: 16px; border-radius: 12px; margin-bottom: 24px;">
            <p style="margin:0 0 4px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Payment Method</p>
            <p style="margin:0; font-size: 14px; font-weight: 700; color: #111827; text-transform: uppercase;">${order.paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Razorpay Online Payment'}</p>
            ${order.paymentMethod === 'cod' ? `<p style="margin:8px 0 0 0; font-size: 13px; font-weight: 600; color: #15803d;">You'll receive a confirmation call from us shortly to confirm your order.</p>` : ''}
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="border-bottom: 2px solid #e5e7eb;">
                <th style="text-align: left; padding-bottom: 8px; color: #6b7280; font-size: 12px; text-transform: uppercase;">Item</th>
                <th style="text-align: right; padding-bottom: 8px; color: #6b7280; font-size: 12px; text-transform: uppercase;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsListHtml}
            </tbody>
          </table>

          <div style="text-align: right; margin-bottom: 24px;">
            <p style="margin: 4px 0; color: #4b5563; font-size: 14px;">Total Amount: <strong style="color: #111827; font-size: 18px;">₹${order.totalAmount}</strong></p>
          </div>

          <div style="border-t: 1px solid #f3f4f6; padding-top: 16px; text-align: center;">
            <p style="margin:0; color:#9ca3af; font-size:12px;">&copy; ${new Date().getFullYear()} HodaHub. All rights reserved.</p>
          </div>
        </div>
      `,
    });
    return { success: !error, data, error };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Send Payment Confirmation Email
 */
export async function sendPaymentConfirmationEmail(toEmail, order) {
  console.log(`[EMAIL] Payment confirmation sent to ${toEmail} for Order #${order.id}`);

  if (!resend) return { success: true, mocked: true };

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [toEmail],
      subject: `Payment Confirmed — Order #${order.id.slice(0, 8)}`,
      html: `
        <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background-color: #ffffff; border-radius: 16px; border: 1px solid #f3f4f6;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="margin:0; color:#111827; font-size:26px; font-weight:800;">Hoda<span style="color:#f97316;">Hub</span></h1>
          </div>
          <h2 style="color: #16a34a; font-size: 20px; font-weight: 700; margin-bottom: 12px; text-align: center;">Payment Received</h2>
          <p style="color: #4b5563; font-size: 14px; line-height: 1.5; text-align: center; margin-bottom: 24px;">
            We have confirmed your payment of <strong>₹${order.totalAmount}</strong> for Order <strong>#${order.id.slice(0, 8)}</strong>.
          </p>
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px;">
            <p style="margin:0; font-size: 14px; color: #15803d; font-weight: 600;">Payment Status: PAID</p>
            ${order.razorpayPaymentId ? `<p style="margin:4px 0 0 0; font-size: 12px; color: #166534;">Payment ID: ${order.razorpayPaymentId}</p>` : ''}
          </div>
          <div style="border-t: 1px solid #f3f4f6; padding-top: 16px; text-align: center;">
            <p style="margin:0; color:#9ca3af; font-size:12px;">&copy; ${new Date().getFullYear()} HodaHub. All rights reserved.</p>
          </div>
        </div>
      `,
    });
    return { success: !error, data, error };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Send Order Status Email (Shipped / Delivered / Cancelled / Refunded)
 */
export async function sendOrderStatusEmail(toEmail, order, newStatus, note = '') {
  console.log(`[EMAIL] Order status update (${newStatus}) sent to ${toEmail} for Order #${order.id}`);

  if (!resend) return { success: true, mocked: true };

  const statusTitles = {
    shipped: 'Your Order Has Shipped',
    delivered: 'Order Delivered',
    cancelled: 'Order Cancelled',
    refunded: 'Payment Refunded',
  };

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [toEmail],
      subject: `Order Update — #${order.id.slice(0, 8)} is now ${newStatus.toUpperCase()}`,
      html: `
        <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background-color: #ffffff; border-radius: 16px; border: 1px solid #f3f4f6;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="margin:0; color:#111827; font-size:26px; font-weight:800;">Hoda<span style="color:#f97316;">Hub</span></h1>
          </div>
          <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin-bottom: 12px; text-align: center;">
            ${statusTitles[newStatus] || `Order Status Updated to ${newStatus}`}
          </h2>
          <p style="color: #4b5563; font-size: 14px; line-height: 1.5; text-align: center; margin-bottom: 24px;">
            Order <strong>#${order.id.slice(0, 8)}</strong> status has been updated to <strong style="text-transform: uppercase;">${newStatus}</strong>.
          </p>
          ${
            note
              ? `<div style="background-color: #f9fafb; padding: 16px; border-radius: 12px; margin-bottom: 24px; text-align: center; font-size: 13px; color: #4b5563;">
                  Note: ${note}
                </div>`
              : ''
          }
          <div style="border-t: 1px solid #f3f4f6; padding-top: 16px; text-align: center;">
            <p style="margin:0; color:#9ca3af; font-size:12px;">&copy; ${new Date().getFullYear()} HodaHub. All rights reserved.</p>
          </div>
        </div>
      `,
    });
    return { success: !error, data, error };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Send Admin Notification on New Order
 */
export async function sendAdminNewOrderEmail(adminEmail, order, items = []) {
  if (!adminEmail || !resend) return { success: true, mocked: true };

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [adminEmail],
      subject: `New Order Alert — #${order.id.slice(0, 8)} (₹${order.totalAmount})`,
      html: `
        <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background-color: #ffffff; border-radius: 16px; border: 1px solid #f3f4f6;">
          <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin-bottom: 12px;">New Order Received!</h2>
          <p style="color: #4b5563; font-size: 14px;">Order #${order.id.slice(0, 8)} of <strong>₹${order.totalAmount}</strong> has been placed via <strong>${order.paymentMethod.toUpperCase()}</strong>.</p>
          <p style="color: #6b7280; font-size: 12px;">Log in to the HodaHub Admin Panel to review and process this order.</p>
        </div>
      `,
    });
    return { success: !error, data, error };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Send Contact Form Email to Store Owner
 */
export async function sendContactFormEmail(contactEmail, { name, email, subject, message }) {
  if (!contactEmail || !resend) return { success: true, mocked: true };

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [contactEmail],
      subject: `Contact Form Message: ${subject}`,
      html: `
        <div style="font-family: 'Inter', -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background-color: #ffffff; border-radius: 16px; border: 1px solid #f3f4f6;">
          <h2 style="color: #111827; font-size: 18px; font-weight: 700; margin-bottom: 12px;">New Contact Message</h2>
          <p style="font-size: 14px; color: #374151;"><strong>From:</strong> ${name} (&lt;${email}&gt;)</p>
          <p style="font-size: 14px; color: #374151;"><strong>Subject:</strong> ${subject}</p>
          <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; font-size: 14px; color: #111827; margin-top: 16px; white-space: pre-wrap;">
            ${message}
          </div>
        </div>
      `,
    });
    return { success: !error, data, error };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
