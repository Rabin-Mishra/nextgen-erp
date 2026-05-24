import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOTPEmail(
  to: string,
  otp: string,
  userName: string
): Promise<{ success: boolean; error?: string }> {
  // Development fallback — no API key configured yet
  if (
    !process.env.RESEND_API_KEY ||
    process.env.RESEND_API_KEY === "your-resend-api-key-here" ||
    process.env.RESEND_API_KEY === "re_your_api_key_here"
  ) {
    console.log("======================================================================");
    console.log(`📧 [DEV MODE] OTP for ${userName} (${to}): ${otp}`);
    console.log("======================================================================");
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: "NextGen ERP <onboarding@resend.dev>",
      to: [to],
      subject: "NextGen ERP — Your Password Reset OTP",
      html: `
        <div style="font-family: Arial, sans-serif; 
                    max-width: 480px; margin: 0 auto; 
                    padding: 32px; 
                    border: 1px solid #e5e7eb; 
                    border-radius: 8px;">
          
          <h2 style="color: #1e293b; margin-bottom: 4px;">
            NextGen Interior & Waterproofing
          </h2>
          <p style="color: #64748b; font-size: 13px; 
                    margin-top: 0;">
            ERP System — Password Reset
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; 
                     margin: 24px 0;" />
          
          <p style="color: #374151;">Hello ${userName},</p>
          <p style="color: #374151;">
            Your password reset OTP is:
          </p>
          
          <div style="background: #f1f5f9; 
                      border-radius: 8px; 
                      padding: 24px; 
                      text-align: center; 
                      margin: 24px 0;
                      letter-spacing: 12px;">
            <span style="font-size: 36px; 
                         font-weight: bold; 
                         color: #1e293b;
                         margin-left: 12px;">
              ${otp}
            </span>
          </div>
          
          <p style="color: #374151; font-size: 14px;">
            ⏱ This OTP expires in <strong>10 minutes</strong>.
          </p>
          <p style="color: #374151; font-size: 14px;">
            🔒 Do not share this code with anyone.
          </p>
          <p style="color: #374151; font-size: 14px;">
            If you did not request a password reset, 
            please contact your administrator immediately.
          </p>
          
          <hr style="border: none; 
                     border-top: 1px solid #e5e7eb; 
                     margin: 24px 0;" />
          
          <p style="color: #94a3b8; font-size: 12px; 
                    text-align: center;">
            NextGen Interior And WaterProofing ERP<br/>
            Gauradaha Nagarpalika-02, Jhapa, Nepal<br/>
            PAN: 122782202
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Email send failed:", err);
    return { success: false, error: "Email service unavailable" };
  }
}
