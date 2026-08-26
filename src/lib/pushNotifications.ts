import { fetchPushStatus, subscribePush, unsubscribePush } from './api'

export type PushSupport = 'unsupported' | 'supported'

export function getPushSupport(): PushSupport {
  return 'serviceWorker' in navigator && 'PushManager' in window ? 'supported' : 'unsupported'
}

/** PushManager quer a chave VAPID como Uint8Array, não como a string base64url que o backend usa. */
function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register('/sw.js')
}

export async function isPushSubscribed(): Promise<boolean> {
  if (getPushSupport() === 'unsupported') return false
  const registration = await getRegistration()
  const subscription = await registration.pushManager.getSubscription()
  return subscription !== null
}

/** Estado combinado local (permissão + subscription do browser) e remoto (o que o backend tem salvo). */
export async function fetchPushState(): Promise<{ subscribed: boolean; permission: NotificationPermission }> {
  const permission = getPushSupport() === 'supported' ? Notification.permission : 'denied'
  if (permission !== 'granted') return { subscribed: false, permission }

  const [localSubscribed, remoteStatus] = await Promise.all([
    isPushSubscribed(),
    fetchPushStatus().catch(() => ({ subscribed: false })),
  ])
  return { subscribed: localSubscribed && remoteStatus.subscribed, permission }
}

export async function enablePush(): Promise<void> {
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) {
    throw new Error('Notificações push não estão configuradas neste ambiente.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Permissão de notificação negada.')
  }

  const registration = await getRegistration()
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }))

  await subscribePush(subscription.toJSON())
}

export async function disablePush(): Promise<void> {
  if (getPushSupport() === 'unsupported') return
  const registration = await getRegistration()
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return

  await unsubscribePush(subscription.endpoint)
  await subscription.unsubscribe()
}
