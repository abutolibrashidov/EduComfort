"""
app/utils/email.py
Email utility using Gmail SMTP via app/core/config.py settings.
"""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from loguru import logger
from app.core.config import settings


def send_email(to: str, subject: str, html: str) -> bool:
    """
    Send an HTML email via SMTP.
    Returns True on success, False on failure — never raises.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(
            "Email not configured. Set SMTP_USER and SMTP_PASSWORD in .env. "
            "Would have sent '{}' to {}".format(subject, to)
        )
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, to, msg.as_string())
        logger.info("Email sent to {}: {}".format(to, subject))
        return True
    except smtplib.SMTPAuthenticationError:
        logger.error(
            "SMTP Authentication failed. "
            "Use a Gmail App Password, not your regular password. "
            "Generate at https://myaccount.google.com/apppasswords"
        )
        return False
    except smtplib.SMTPException as e:
        logger.error("SMTP error sending to {}: {}".format(to, e))
        return False
    except Exception as e:
        logger.error("Unexpected error sending email to {}: {}".format(to, e))
        return False


def password_reset_email(reset_url: str, user_name: str) -> str:
    """Bilingual (Uzbek + English) password reset email template."""
    template = """<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Parolni tiklash</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;
                      box-shadow:0 4px 20px rgba(0,0,0,0.08);max-width:560px;width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,#0061f2 0%,#0284c7 100%);
                        padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:800;">EduComfort</h1>
              <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">
                Smart Learning Management Platform
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="color:#0f172a;font-size:20px;margin:0 0 8px;">
                Salom, NAME_PLACEHOLDER!
              </h2>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Siz EduComfort hisobingiz uchun parolni tiklash so'rovini yubordingiz.<br/>
                <em style="color:#94a3b8;font-size:13px;">
                  You requested a password reset for your EduComfort account.
                </em>
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="URL_PLACEHOLDER"
                   style="background:linear-gradient(135deg,#0061f2 0%,#0284c7 100%);
                           color:#ffffff;text-decoration:none;padding:14px 36px;
                           border-radius:8px;font-size:16px;font-weight:700;
                           display:inline-block;">
                  Parolni tiklash / Reset Password
                </a>
              </div>
              <div style="background:#fff8e1;border-left:4px solid #f59e0b;
                           border-radius:6px;padding:14px 16px;margin:24px 0;">
                <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
                  Bu havola 1 soat davomida amal qiladi.<br/>
                  <em>This link expires in 1 hour.</em>
                </p>
              </div>
              <p style="color:#94a3b8;font-size:12px;margin:16px 0 0;">
                Agar tugma ishlamasa:<br/>
                <a href="URL_PLACEHOLDER" style="color:#0061f2;word-break:break-all;">URL_PLACEHOLDER</a>
              </p>
              <p style="color:#94a3b8;font-size:12px;margin:20px 0 0;padding-top:16px;
                          border-top:1px solid #f1f5f9;">
                Agar siz bu so'rovni yubormagan bo'lsangiz, bu xabarni e'tiborsiz qoldiring.<br/>
                <em>If you did not request this, you can safely ignore this email.</em>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;text-align:center;
                        border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">
                2025 EduComfort · educomfort.uz
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
    return template.replace("NAME_PLACEHOLDER", user_name).replace("URL_PLACEHOLDER", reset_url)