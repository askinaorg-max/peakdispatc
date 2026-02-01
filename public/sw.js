self.addEventListener('push', function(event) {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}

  const title = data.type === 'incoming-call' ? 'Incoming video call' : 'PeakDispatch notification';
  const body = data.type === 'incoming-call'
    ? 'Tap to open admin and accept.'
    : (data.type === 'new-comment' ? 'New comment submitted (pending).' : 'Open for details.');

  const url = data.type === 'incoming-call' ? '/admin#calls' : '/admin#comments';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: { url },
      renotify: true,
      tag: data.type === 'incoming-call' ? 'incoming-call' : 'pd',
      icon: '/images/peakdispatch-logo.png'
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/admin';
  event.waitUntil(clients.openWindow(url));
});
