// Service Worker for Push Notifications
// This file must be at the root of public/ to have scope over the entire app

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};

  const options = {
    body: data.body || '',
    icon: data.icon || '/logo-192.png',
    badge: data.badge || '/badge-72.png',
    tag: data.tag || 'general',
    renotify: true,
    data: data.data || {},
    actions: [
      { action: 'open', title: 'Mở hội thoại' },
      { action: 'dismiss', title: 'Bỏ qua' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Tino Wiki CRM', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const conversationId = event.notification.data?.conversationId;
  const url = conversationId
    ? `/conversations?id=${conversationId}`
    : '/conversations';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes('/conversations') && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      return self.clients.openWindow(url);
    })
  );
});
