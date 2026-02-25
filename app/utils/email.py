"""
Email delivery utility for EduComfort.

Uses Resend (https://resend.com) as the email provider.
Set EMAIL_API_KEY in .env to activate.

In development (no API key configured), emails are printed to the console.
"""
import httpx
from loguru import logger
from app.core.config import settings


def send_email(to: str, subject: str, html: str) -> bool:
    """
    Send a transactional email via Resend.
    Returns True on success, False on failure.
    """
    if not settings.EMAIL_API_KEY:
        # Dev mode — print to console so developer can see what would be sent
        logger.warning(
            f"[EMAIL - DEV MODE] To: {to} | Subject: {subject}\n{html}"
        )
        return True

    try:
        response = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.EMAIL_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.EMAIL_FROM,
                "to": [to],
                "subject": subject,
                "html": html,
            },
            timeout=10,
        )
        if response.status_code in (200, 201):
            logger.info(f"Email sent to {to}: {subject}")
            return True
        else:
            logger.error(f"Resend API error {response.status_code}: {response.text}")
            return False
    except Exception as e:
        logger.exception(f"Email send failed to {to}: {e}")
        return False


# ---------------------------------------------------------------------------
# Email Templates
# ---------------------------------------------------------------------------

def password_reset_email(reset_url: str, first_name: str = "User") -> str:
    """Returns the HTML body for a password-reset email."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0;">
      <div style="max-width: 560px; margin: 40px auto; background: #fff; border-radius: 12px;
                  padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1890ff; margin: 0; font-size: 28px;">EduComfort</h1>
        </div>
        <h2 style="color: #222; font-size: 20px;">Password Reset Request</h2>
        <p style="color: #555; line-height: 1.6;">Hi {first_name},</p>
        <p style="color: #555; line-height: 1.6;">
          We received a request to reset your password. Click the button below to
          choose a new one. This link expires in <strong>1 hour</strong>.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="{reset_url}"
             style="background: #1890ff; color: #fff; text-decoration: none;
                    padding: 14px 32px; border-radius: 8px; font-size: 16px;
                    font-weight: 600; display: inline-block;">
            Reset my password
          </a>
        </div>
        <p style="color: #888; font-size: 13px; line-height: 1.6;">
          If you didn't request this, you can safely ignore this email.<br>
          This link will expire in 1 hour for your security.
        </p>
        <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 24px 0;">
        <p style="color: #bbb; font-size: 12px; text-align: center;">
          &copy; 2025 EduComfort. All rights reserved.
        </p>
      </div>
    </body>
    </html>
    """
