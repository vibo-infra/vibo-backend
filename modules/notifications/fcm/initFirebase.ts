import * as fs from 'fs';
import * as admin from 'firebase-admin';

let initialized = false;

/**
 * Loads Firebase Admin from env (no keys in repo).
 * - `FIREBASE_SERVICE_ACCOUNT_PATH`: absolute or cwd-relative JSON path
 * - `FIREBASE_SERVICE_ACCOUNT_JSON`: raw JSON string (e.g. Cloud secret)
 */
export function tryInitFirebaseAdmin(): boolean {
  if (initialized) return true;
  if (admin.apps.length > 0) {
    initialized = true;
    return true;
  }

  const pathEnv = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

  console.log('[fcm] Initializing Firebase Admin with', {
    pathEnv: !!pathEnv,
    jsonEnv: !!jsonEnv,
  });

  try {
    if (pathEnv) {
      const resolved = fs.existsSync(pathEnv) ? pathEnv : fs.existsSync(`${process.cwd()}/${pathEnv}`) ? `${process.cwd()}/${pathEnv}` : '';
      if (!resolved) {
        console.warn('[fcm] FIREBASE_SERVICE_ACCOUNT_PATH not found:', pathEnv);
        return false;
      }
      const cred = JSON.parse(fs.readFileSync(resolved, 'utf8')) as admin.ServiceAccount;
      admin.initializeApp({ credential: admin.credential.cert(cred) });
      initialized = true;
      return true;
    }
    if (jsonEnv) {
      const cred = JSON.parse(jsonEnv) as admin.ServiceAccount;
      admin.initializeApp({ credential: admin.credential.cert(cred) });
      initialized = true;
      return true;
    }
  } catch (e) {
    console.error('[fcm] Failed to initialize Firebase Admin', e);
    return false;
  }

  return false;
}

export function getFirebaseMessaging(): admin.messaging.Messaging | null {
  if (!tryInitFirebaseAdmin()) return null;
  return admin.messaging();
}
