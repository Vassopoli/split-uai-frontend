import { useEffect, useMemo, useState } from 'react'
import { AuditLogList } from '../components/AuditLogList'
import { Card } from '../components/Card'
import { useAppStore } from '../store/useAppStore'
import * as api from '../lib/api'
import type { AuditLogEntry } from '../types'

export function Activity() {
  const friends = useAppStore((s) => s.friends)
  const markActivityRead = useAppStore((s) => s.markActivityRead)

  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const friendsById = useMemo(
    () => Object.fromEntries(friends.map((f) => [f.id, f])),
    [friends],
  )

  // Zera o badge assim que a aba abre, sem esperar o próximo poll de 30s.
  useEffect(() => {
    markActivityRead().catch(() => {
      // best-effort — se falhar, o próximo poll tenta de novo
    })
  }, [markActivityRead])

  useEffect(() => {
    setLoading(true)
    setError(null)
    api
      .fetchActivityLog()
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao buscar atividades.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="px-1 text-lg font-semibold text-[#12251f] dark:text-white">Atividades</h1>
      <Card className="overflow-hidden">
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-[#8a8593]">Carregando atividades...</p>
        ) : error ? (
          <p className="px-5 py-10 text-center text-sm text-owe-600">{error}</p>
        ) : (
          <AuditLogList
            entries={entries ?? []}
            friendsById={friendsById}
            emptyMessage="Nenhuma atividade registrada ainda."
          />
        )}
      </Card>
    </div>
  )
}
