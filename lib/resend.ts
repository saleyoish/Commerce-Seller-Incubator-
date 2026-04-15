import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.FROM_EMAIL || 'noreply@livecommerce.app';

if (!resendApiKey) {
  throw new Error('Missing RESEND_API_KEY environment variable');
}

export const resend = new Resend(resendApiKey);

// Email templates
export const sendSellerSignupConfirmation = async (to: string, sellerName: string) => {
  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: 'Welcome to Live Commerce Platform',
      html: `
        <h1>Welcome to Live Commerce!</h1>
        <p>Hi ${sellerName},</p>
        <p>Thank you for signing up as a seller. Your account is currently pending admin approval.</p>
        <p>Next steps:</p>
        <ol>
          <li>Complete your Stripe Connect onboarding</li>
          <li>Wait for admin approval</li>
          <li>Upload your products</li>
          <li>Start selling!</li>
        </ol>
        <p>Best regards,<br>Live Commerce Team</p>
      `,
    });
  } catch (error) {
    console.error('Failed to send signup confirmation:', error);
  }
};

export const sendSellerApprovalNotification = async (to: string, sellerName: string, approved: boolean) => {
  try {
    const status = approved ? 'approved' : 'rejected';
    const subject = approved 
      ? 'Your Seller Account Has Been Approved!' 
      : 'Update on Your Seller Application';
    const message = approved
      ? 'Congratulations! Your seller account has been approved. You can now start uploading products and going live.'
      : 'We regret to inform you that your seller application has been rejected. Please contact support for more information.';

    await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html: `
        <h1>Account ${status}</h1>
        <p>Hi ${sellerName},</p>
        <p>${message}</p>
        ${approved ? '<p><a href="/dashboard">Go to Dashboard</a></p>' : ''}
        <p>Best regards,<br>Live Commerce Team</p>
      `,
    });
  } catch (error) {
    console.error('Failed to send approval notification:', error);
  }
};

export const sendSaleNotification = async (to: string, sellerName: string, productName: string, amount: number) => {
  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: 'New Sale!',
      html: `
        <h1>You Made a Sale!</h1>
        <p>Hi ${sellerName},</p>
        <p>Great news! Someone just purchased your product:</p>
        <ul>
          <li><strong>Product:</strong> ${productName}</li>
          <li><strong>Amount:</strong> $${amount.toFixed(2)}</li>
        </ul>
        <p>The sale is being processed and will be included in your next payout.</p>
        <p>Best regards,<br>Live Commerce Team</p>
      `,
    });
  } catch (error) {
    console.error('Failed to send sale notification:', error);
  }
};

export const sendPayoutNotification = async (to: string, sellerName: string, amount: number) => {
  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: 'Payout Initiated',
      html: `
        <h1>Payout Initiated</h1>
        <p>Hi ${sellerName},</p>
        <p>A payout of <strong>$${amount.toFixed(2)}</strong> has been initiated to your connected bank account.</p>
        <p>It may take 1-2 business days to appear in your account.</p>
        <p>Best regards,<br>Live Commerce Team</p>
      `,
    });
  } catch (error) {
    console.error('Failed to send payout notification:', error);
  }
};
