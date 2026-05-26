/* i5 Nexus Service Worker — Push Notifications */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data?.json() || {}; } catch {}

  const title   = data.title   || 'i5 Nexus';
  const body    = data.message || 'You have a new notification';
  const url     = data.url     || '/';
  const type    = data.type    || 'general';

  const iconMap = {
    leave:    '/icons/icon-192.png',
    feedback: '/icons/icon-192.png',
    todo:     '/icons/icon-192.png',
    offer:    '/icons/icon-192.png',
    report:   '/icons/icon-192.png',
    general:  '/icons/icon-192.png',
  };

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: iconMap[type] || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [200, 100, 200],
      tag: `i5nexus-${type}`,
      renotify: true,
      data: { url },
      actions: [
        { action: 'view',    title: 'View' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); existing.navigate(url); }
      else clients.openWindow(url);
    })
  );
});
