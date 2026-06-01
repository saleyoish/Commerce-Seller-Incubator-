import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("Testing Gmail API...");
    
    // Test with your provided credentials
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;
    
    console.log("Gmail User:", gmailUser);
    console.log("Gmail Password exists:", !!gmailPassword);
    
    if (!gmailUser || !gmailPassword) {
      return NextResponse.json({ 
        error: "Gmail credentials not configured",
        user: gmailUser,
        passwordExists: !!gmailPassword
      });
    }
    
    // Import nodemailer dynamically
    const nodemailer = (await import("nodemailer")).default;
    
    // Create test transporter
    const transporter = nodemailer.createTransporter({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    });
    
    // Verify connection
    await transporter.verify();
    console.log("Gmail transporter verified successfully");
    
    // Send test email
    const info = await transporter.sendMail({
      from: `"TikTok Shop Fast Track" <${gmailUser}>`,
      to: gmailUser, // Send to yourself for testing
      subject: "📧 Gmail API Test - TikTok Shop",
      html: `
        <h2>✅ Gmail API Working!</h2>
        <p>This is a test email from your TikTok Shop Fast Track application.</p>
        <p>If you receive this, Gmail integration is working correctly.</p>
        <br>
        <p>Time: ${new Date().toLocaleString()}</p>
      `,
    });
    
    console.log("Test email sent:", info.messageId);
    
    return NextResponse.json({ 
      success: true,
      message: "Test email sent successfully!",
      messageId: info.messageId,
      sentTo: gmailUser
    });
    
  } catch (error) {
    console.error("Gmail test error:", error);
    return NextResponse.json({ 
      error: "Gmail test failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
