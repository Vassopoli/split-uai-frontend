import { useRef, useState } from 'react'
import { Camera, ImagePlus, Loader2, TriangleAlert } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'
import { scanReceipt, type ScanReceiptResult } from '../lib/api'
import { compressReceiptImage } from '../lib/receiptImage'

type Status =
  | { kind: 'idle' }
  | { kind: 'processing' }
  | { kind: 'unreadable' }
  | { kind: 'rate_limited'; message: string }
  | { kind: 'error'; message: string }

export function ScanReceiptModal({
  onClose,
  onScanned,
  onManualFallback,
}: {
  onClose: () => void
  /** A receipt was read successfully — hand the raw result off to the caller (draft-building + itemization live there). */
  onScanned: (result: ScanReceiptResult) => void
  /** Give up on scanning and go straight to the empty manual form. */
  onManualFallback: () => void
}) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const processing = status.kind === 'processing'

  async function handleFile(file: File | undefined) {
    if (!file) return
    setStatus({ kind: 'processing' })
    try {
      const compressed = await compressReceiptImage(file)
      const outcome = await scanReceipt(compressed)
      if (outcome.status === 'ok') {
        onScanned(outcome.data)
        return
      }
      if (outcome.status === 'unreadable') {
        setStatus({ kind: 'unreadable' })
        return
      }
      setStatus({ kind: 'rate_limited', message: outcome.message })
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Erro ao processar a nota fiscal.',
      })
    }
  }

  return (
    <Modal title="Escanear nota fiscal" onClose={onClose}>
      <div className="space-y-4">
        {status.kind === 'idle' && (
          <>
            <p className="text-sm text-[#4b4655] dark:text-gray-300">
              Tire uma foto ou escolha uma imagem da nota fiscal — a gente lê os valores pra
              você pré-preencher a despesa.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => cameraInputRef.current?.click()} type="button">
                <Camera size={16} /> Tirar foto
              </Button>
              <Button
                variant="secondary"
                onClick={() => galleryInputRef.current?.click()}
                type="button"
              >
                <ImagePlus size={16} /> Escolher da galeria
              </Button>
            </div>
            <button
              type="button"
              onClick={onManualFallback}
              className="w-full text-center text-xs text-[#6b6375] underline-offset-2 hover:underline dark:text-gray-400"
            >
              Preencher manualmente
            </button>
          </>
        )}

        {processing && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Loader2 size={28} className="animate-spin text-brand-500" />
            <p className="text-sm text-[#4b4655] dark:text-gray-300">
              Lendo sua nota fiscal... isso pode levar alguns segundos.
            </p>
          </div>
        )}

        {status.kind === 'unreadable' && (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <TriangleAlert size={24} className="text-amber-500" />
            <p className="text-sm text-[#4b4655] dark:text-gray-300">
              Não conseguimos ler essa nota. Tente outra foto ou preencha os campos manualmente.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onManualFallback} type="button">
                Preencher manualmente
              </Button>
              <Button onClick={() => setStatus({ kind: 'idle' })} type="button">
                Tentar outra foto
              </Button>
            </div>
          </div>
        )}

        {status.kind === 'rate_limited' && (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <TriangleAlert size={24} className="text-amber-500" />
            <p className="text-sm text-[#4b4655] dark:text-gray-300">{status.message}</p>
            <Button variant="secondary" onClick={onManualFallback} type="button">
              Preencher manualmente
            </Button>
          </div>
        )}

        {status.kind === 'error' && (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <p className="text-sm text-owe-600">{status.message}</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onManualFallback} type="button">
                Preencher manualmente
              </Button>
              <Button onClick={() => setStatus({ kind: 'idle' })} type="button">
                Tentar de novo
              </Button>
            </div>
          </div>
        )}

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          capture="environment"
          className="hidden"
          disabled={processing}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            void handleFile(file)
          }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
          disabled={processing}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            void handleFile(file)
          }}
        />
      </div>
    </Modal>
  )
}
