import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuditLogList } from '../components/AuditLogList'
import { Avatar } from '../components/Avatar'
import { Card } from '../components/Card'
import { useAppStore } from '../store/useAppStore'
import * as api from '../lib/api'
import type { AuditLogEntry } from '../types'

export function Activity() {
  const friends = useAppStore((s) => s.friends)
  const markActivityRead = useAppStore((s) => s.markActivityRead)

  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null)
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const friendsById = useMemo(
    () => Object.fromEntries(friends.map((f) => [f.id, f])),
    [friends],
  )
  const selectedFriend = selectedFriendId ? friendsById[selectedFriendId] : null

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
      .fetchActivityLog(selectedFriendId ?? undefined)
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao buscar atividades.'))
      .finally(() => setLoading(false))
  }, [selectedFriendId])

  return (
    <div className="space-y-6">
      <h1 className="px-1 text-lg font-semibold text-[#12251f] dark:text-white">Atividades</h1>

      {friends.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterChip
            label="Todos"
            active={selectedFriendId === null}
            onClick={() => setSelectedFriendId(null)}
          />
          {friends.map((f) => (
            <FilterChip
              key={f.id}
              label={f.name.split(' ')[0]}
              avatar={
                <Avatar name={f.name} initials={f.initials} color={f.color} picture={f.picture} size="sm" />
              }
              active={selectedFriendId === f.id}
              onClick={() => setSelectedFriendId(f.id)}
            />
          ))}
        </div>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-[#8a8593]">Carregando atividades...</p>
        ) : error ? (
          <p className="px-5 py-10 text-center text-sm text-owe-600">{error}</p>
        ) : (
          <AuditLogList
            entries={entries ?? []}
            friendsById={friendsById}
            emptyMessage={
              selectedFriend
                ? `Nenhuma atividade com ${selectedFriend.name.split(' ')[0]} ainda.`
                : 'Nenhuma atividade registrada ainda.'
            }
          />
        )}
      </Card>
    </div>
  )
}

function FilterChip({
  label,
  avatar,
  active,
  onClick,
}: {
  label: string
  avatar?: ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
          : 'border-black/10 text-[#4b4655] hover:bg-black/[0.03] dark:border-white/15 dark:text-gray-300'
      }`}
    >
      {avatar}
      {label}
    </button>
  )
}
