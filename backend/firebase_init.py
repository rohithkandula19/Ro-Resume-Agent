"""Firebase Admin SDK — initialise once, expose Firestore client."""
import json
import os

import firebase_admin
from firebase_admin import credentials, firestore

_app = None


def _init() -> None:
    global _app
    if _app is not None:
        return
    sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if sa_json:
        cred = credentials.Certificate(json.loads(sa_json))
    elif cred_path:
        cred = credentials.Certificate(cred_path)
    else:
        cred = credentials.ApplicationDefault()
    _app = firebase_admin.initialize_app(cred)


def get_db() -> firestore.Client:
    _init()
    return firestore.client()
