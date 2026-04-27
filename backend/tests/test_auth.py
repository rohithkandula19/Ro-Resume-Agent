"""Password hashing + token lifecycle against a tempfile SQLite."""

import pytest

import auth as _auth


def test_password_roundtrip():
    h = _auth.hash_password("hunter2")
    assert _auth.verify_password("hunter2", h) is True
    assert _auth.verify_password("wrong", h) is False


def test_create_and_authenticate_user():
    user = _auth.create_user("alice@example.com", "pw-alice-123", name="Alice")
    assert user["email"] == "alice@example.com"
    assert user["name"] == "Alice"

    ok = _auth.authenticate("alice@example.com", "pw-alice-123")
    assert ok["id"] == user["id"]

    with pytest.raises(Exception):
        _auth.authenticate("alice@example.com", "wrong")


def test_issue_and_resolve_token():
    user = _auth.create_user("bob@example.com", "bob-password-1", name="Bob")
    token = _auth.issue_token(user["id"])
    assert token
    resolved = _auth.user_from_token(token)
    assert resolved is not None
    assert resolved["id"] == user["id"]


def test_reset_token_flow():
    email = "carol@example.com"
    _auth.create_user(email, "carol-old-password", name="Carol")
    token = _auth.create_reset_token(email)
    assert token
    assert _auth.consume_reset_token(token, "carol-new-password") is True
    # Token should be single-use
    assert _auth.consume_reset_token(token, "anything") is False
    # New password works
    _auth.authenticate(email, "carol-new-password")


def test_reset_token_unknown_email_returns_none():
    assert _auth.create_reset_token("nobody@nowhere.example") is None
