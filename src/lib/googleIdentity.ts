/**
 * Google Identity Services (GIS) Client Integration for Farm2Home
 *
 * Guarantees:
 * 1. Single SDK script tag injected once into <head> with id="google-gsi-script".
 * 2. google.accounts.id.initialize() is called strictly ONCE per application lifecycle.
 * 3. Centralized credential dispatching: components safely register and unregister callbacks
 *    without re-initializing the GIS client or colliding during StrictMode re-renders.
 * 4. Explicit credential flow: "Continue with Google" uses the GIS credential flow via
 *    renderButton, which does not rely on FedCM/One Tap and avoids NotAllowedError in iframes.
 * 5. Safe environment detection and non-blocking failure modes.
 */

export interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
  clientId?: string;
}

type CredentialListener = (response: GoogleCredentialResponse) => void | Promise<void>;

let scriptLoadingPromise: Promise<boolean> | null = null;
let isGsiInitialized = false;
let initPromise: Promise<boolean> | null = null;
const credentialListeners = new Set<CredentialListener>();

/**
 * Retrieve the Google OAuth 2.0 Web Client ID from client environment.
 */
export function getGoogleClientId(): string {
  if (typeof window !== 'undefined') {
    return (
      (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
      (import.meta as any).env?.GOOGLE_CLIENT_ID ||
      (window as any).__ENV__?.VITE_GOOGLE_CLIENT_ID ||
      (window as any).__ENV__?.GOOGLE_CLIENT_ID ||
      (typeof process !== 'undefined' ? process.env?.VITE_GOOGLE_CLIENT_ID || process.env?.GOOGLE_CLIENT_ID : '') ||
      ''
    ).trim();
  }
  return (
    (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
    (typeof process !== 'undefined' ? process.env?.VITE_GOOGLE_CLIENT_ID || process.env?.GOOGLE_CLIENT_ID : '') ||
    ''
  ).trim();
}

/**
 * Check if the Google Client ID is configured.
 */
export function isGoogleAuthAvailable(): boolean {
  return !!getGoogleClientId();
}

/**
 * Dynamically load the Google Identity Services SDK script once.
 * Reuses existing script tag if already in DOM or already loaded.
 */
export function loadGoogleIdentityScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  // If already attached to window
  if ((window as any).google?.accounts?.id) {
    return Promise.resolve(true);
  }

  // If load is already in-flight, return the active promise
  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise<boolean>((resolve) => {
    const existing = document.getElementById('google-gsi-script') as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).google?.accounts?.id) {
        resolve(true);
        return;
      }
      existing.addEventListener('load', () => resolve(!!(window as any).google?.accounts?.id), { once: true });
      existing.addEventListener('error', () => {
        scriptLoadingPromise = null;
        resolve(false);
      }, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      resolve(!!(window as any).google?.accounts?.id);
    };
    script.onerror = () => {
      scriptLoadingPromise = null;
      console.warn('[GIS] Failed to load Google Identity Services SDK script from Google CDN');
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
}

/**
 * Ensures google.accounts.id.initialize() is executed EXACTLY ONCE per application lifecycle.
 */
export async function ensureGoogleIdentityInitialized(): Promise<boolean> {
  if (isGsiInitialized) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const clientId = getGoogleClientId();
    if (!clientId) {
      console.warn('[GIS] Google Client ID is not configured (missing VITE_GOOGLE_CLIENT_ID)');
      return false;
    }

    const scriptLoaded = await loadGoogleIdentityScript();
    if (!scriptLoaded) return false;

    const google = (window as any).google;
    if (!google?.accounts?.id) return false;

    // Double check guard after async loading
    if (isGsiInitialized) return true;

    try {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
          if (!response?.credential) {
            console.warn('[GIS] Credential callback triggered without valid credential');
            return;
          }
          // Dispatch to all currently active listeners
          for (const listener of credentialListeners) {
            try {
              listener(response);
            } catch (err) {
              console.error('[GIS] Error in credential listener:', err);
            }
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: false,
      });

      isGsiInitialized = true;
      return true;
    } catch (err) {
      console.error('[GIS] Failed to initialize Google Identity Services client:', err);
      return false;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Register a listener for Google credential responses.
 * Returns an unregister function for component unmount cleanup.
 */
export function addGoogleCredentialListener(listener: CredentialListener): () => void {
  credentialListeners.add(listener);
  return () => {
    credentialListeners.delete(listener);
  };
}

export interface RenderButtonOptions {
  theme?: 'outline' | 'filled_black' | 'filled_blue';
  size?: 'large' | 'medium' | 'small';
  text?: 'continue_with' | 'signin_with' | 'signup_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  width?: number;
  clickListener?: () => void;
}

/**
 * Renders a Google Sign-In button into a DOM container element.
 * Safe to call on mount; cleans up previous renders inside the container.
 */
export async function renderGoogleSignInButton(
  container: HTMLElement | null,
  options?: RenderButtonOptions
): Promise<boolean> {
  if (!container) return false;

  const initialized = await ensureGoogleIdentityInitialized();
  if (!initialized) return false;

  const google = (window as any).google;
  if (!google?.accounts?.id) return false;

  try {
    // Clear container to avoid duplicate nested buttons
    container.innerHTML = '';

    google.accounts.id.renderButton(container, {
      type: 'standard',
      theme: options?.theme || 'outline',
      size: options?.size || 'large',
      text: options?.text || 'continue_with',
      shape: options?.shape || 'rectangular',
      logo_alignment: 'left',
      width: options?.width || 360,
      click_listener: options?.clickListener,
    });
    return true;
  } catch (err) {
    console.warn('[GIS] Failed to render Google Sign-In button:', err);
    return false;
  }
}

/**
 * Optional non-blocking helper for Google One Tap prompt.
 * FedCM / iframe permission failures are caught silently and never block explicit sign-in.
 */
export function tryPromptOneTap(options?: {
  onNotification?: (notification: any) => void;
}) {
  if (typeof window === 'undefined') return;
  const google = (window as any).google;
  if (!google?.accounts?.id || !isGsiInitialized) return;

  try {
    google.accounts.id.prompt((notification: any) => {
      if (options?.onNotification) {
        options.onNotification(notification);
      }
      if (notification.isNotDisplayed()) {
        const reason = notification.getNotDisplayedReason?.() || 'unknown';
        console.info('[GIS One Tap] Not displayed:', reason);
      } else if (notification.isSkippedMoment()) {
        const reason = notification.getSkippedReason?.() || 'skipped';
        console.info('[GIS One Tap] Skipped:', reason);
      } else if (notification.isDismissedMoment()) {
        const reason = notification.getDismissedReason?.() || 'dismissed';
        console.info('[GIS One Tap] Dismissed:', reason);
      }
    });
  } catch (err) {
    // Graceful silent handling: FedCM or iframe restrictions must not break user experience
    console.info('[GIS One Tap] Prompt suppressed or restricted in this environment:', err);
  }
}
