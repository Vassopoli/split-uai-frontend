// Service worker só pra Web Push — sem cache/offline (fora do escopo do app).
// Payload esperado (ver "Notificações push" em docs/backend-api-contract.md):
// { "title": "...", "body": "...", "url": "/friends/123" }

self.addEventListener('push', (event) => {
  let data = { title: 'Split Uai', body: '' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    // payload não era JSON — mantém o fallback
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
