from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
import smtplib
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

router = APIRouter()


class ContactMessage(BaseModel):
    name: str
    email: EmailStr
    message: str


def send_contact_email(name: str, sender_email: str, message: str):
    """Send contact form email via Gmail SMTP in a background thread."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"New Contact Message from {name} — SDG3 Health Platform"
        msg["From"] = settings.MAIL_FROM
        msg["To"] = settings.MAIL_FROM   # send to outbreak.forecast@gmail.com

        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 30px;">
            <div style="max-width: 560px; margin: auto; background: white; border-radius: 12px;
                        padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
              <div style="display:flex; align-items:center; gap:10px; margin-bottom:24px;">
                <div style="width:40px; height:40px; background:#16a34a; border-radius:10px;
                            display:flex; align-items:center; justify-content:center;">
                  <span style="color:white; font-size:20px;">✉</span>
                </div>
                <h2 style="margin:0; color:#111827; font-size:18px;">New Contact Form Submission</h2>
              </div>

              <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
                <tr>
                  <td style="padding:10px 0; border-bottom:1px solid #f3f4f6;
                             color:#6b7280; font-size:13px; width:100px;">Name</td>
                  <td style="padding:10px 0; border-bottom:1px solid #f3f4f6;
                             color:#111827; font-weight:600; font-size:14px;">{name}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0; border-bottom:1px solid #f3f4f6;
                             color:#6b7280; font-size:13px;">Email</td>
                  <td style="padding:10px 0; border-bottom:1px solid #f3f4f6;
                             color:#2563eb; font-size:14px;">
                    <a href="mailto:{sender_email}" style="color:#2563eb;">{sender_email}</a>
                  </td>
                </tr>
              </table>

              <div style="background:#f9fafb; border-radius:8px; padding:16px; margin-bottom:24px;">
                <p style="margin:0 0 8px; color:#6b7280; font-size:12px;
                          font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Message</p>
                <p style="margin:0; color:#111827; font-size:14px; line-height:1.6;
                          white-space:pre-wrap;">{message}</p>
              </div>

              <p style="margin:0; color:#9ca3af; font-size:12px; text-align:center;">
                SDG3 Health Platform &mdash; Disease Outbreak Prediction System
              </p>
            </div>
          </body>
        </html>
        """
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15) as server:
            server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.sendmail(settings.MAIL_FROM, settings.MAIL_FROM, msg.as_string())

        print(f"[CONTACT] Email received from {sender_email}")
    except Exception as e:
        print(f"[CONTACT ERROR] {e}")


@router.post("/contact")
def contact(data: ContactMessage):
    """Receive contact form and send email via Gmail SMTP."""
    if not settings.MAIL_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email service not configured. Please set MAIL_PASSWORD in .env"
        )

    thread = threading.Thread(
        target=send_contact_email,
        args=(data.name, data.email, data.message),
        daemon=True
    )
    thread.start()

    return {"message": "Message received! We'll get back to you soon."}
