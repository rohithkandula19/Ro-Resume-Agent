"""Minimal SMTP sender for transactional email (password resets).

Reads config from env:
  SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASSWORD,
  SMTP_FROM (defaults to SMTP_USER), APP_URL (defaults to http://localhost:3000).

If SMTP_HOST is unset, `send()` returns False without raising — the caller
falls back to dev behaviour (returning the token in the HTTP response)."""

from __future__ import annotations

import os
import smtplib
import ssl
from email.message import EmailMessage


def is_configured() -> bool:
    return bool(os.getenv("SMTP_HOST"))


def app_url() -> str:
    return (os.getenv("APP_URL") or "http://localhost:3000").rstrip("/")


def send(to: str, subject: str, text: str, html: str | None = None) -> bool:
    """Send an email. Returns True on success, False if not configured or on error.
    Never raises — callers treat False as "email not delivered"."""
    host = os.getenv("SMTP_HOST")
    if not host:
        return False
    port = int(os.getenv("SMTP_PORT") or 587)
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    sender = os.getenv("SMTP_FROM") or user or "no-reply@localhost"

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = to
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")

    try:
        if port == 465:
            with smtplib.SMTP_SSL(host, port, context=ssl.create_default_context(), timeout=15) as s:
                if user and password:
                    s.login(user, password)
                s.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=15) as s:
                s.ehlo()
                try:
                    s.starttls(context=ssl.create_default_context())
                    s.ehlo()
                except smtplib.SMTPException:
                    pass
                if user and password:
                    s.login(user, password)
                s.send_message(msg)
        return True
    except Exception:
        return False


def send_password_reset(email: str, token: str) -> bool:
    link = f"{app_url()}/reset-password?token={token}"
    subject = "Reset your RO Resume Agent password"
    text = (
        "Someone (hopefully you) requested a password reset for your RO Resume Agent account.\n\n"
        f"Use this link within 30 minutes to choose a new password:\n{link}\n\n"
        "If you didn't request this, you can ignore this message — your password stays the same."
    )
    html = (
        "<p>Someone (hopefully you) requested a password reset for your RO Resume Agent account.</p>"
        f'<p><a href="{link}">Choose a new password</a> (link valid for 30 minutes).</p>'
        "<p>If you didn't request this, you can ignore this message.</p>"
    )
    return send(email, subject, text, html)
