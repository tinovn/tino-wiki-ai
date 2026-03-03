import apiClient from '@/lib/api-client';

let swRegistration: ServiceWorkerRegistration | null = null;

export async function initPushService(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Push] Push notifications not supported');
    return false;
  }

  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[Push] Service worker registered');
    return true;
  } catch (error) {
    console.error('[Push] SW registration failed:', error);
    return false;
  }
}

export async function getVapidPublicKey(): Promise<string> {
  const res = await apiClient.get<{ publicKey: string }>('/push-subscriptions/vapid-key');
  return res.data.publicKey;
}

export async function subscribeToPush(): Promise<boolean> {
  if (!swRegistration) {
    const initialized = await initPushService();
    if (!initialized) return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[Push] Notification permission denied');
      return false;
    }

    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) {
      console.warn('[Push] VAPID key not configured on server');
      return false;
    }

    // Convert VAPID key to Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    const subscription = await swRegistration!.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource,
    });

    const subscriptionJson = subscription.toJSON();

    // Register with backend
    await apiClient.post('/push-subscriptions', {
      type: 'WEB_PUSH',
      endpoint: subscriptionJson.endpoint,
      keys: subscriptionJson.keys,
      userAgent: navigator.userAgent,
    });

    console.log('[Push] Subscription registered');
    return true;
  } catch (error) {
    console.error('[Push] Subscription failed:', error);
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!swRegistration) return;

  try {
    const subscription = await swRegistration.pushManager.getSubscription();
    if (subscription) {
      await apiClient.delete('/push-subscriptions', {
        data: { endpoint: subscription.endpoint },
      });
      await subscription.unsubscribe();
      console.log('[Push] Unsubscribed');
    }
  } catch (error) {
    console.error('[Push] Unsubscribe failed:', error);
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!swRegistration) return false;
  const subscription = await swRegistration.pushManager.getSubscription();
  return !!subscription;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
