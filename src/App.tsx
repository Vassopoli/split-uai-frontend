import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { FriendDetail } from './pages/FriendDetail'
import { Invites } from './pages/Invites'
import { Stats } from './pages/Stats'
import { LoginScreen } from './pages/LoginScreen'
import { AddExpenseModal } from './components/AddExpenseModal'
import { ScanReceiptModal } from './components/ScanReceiptModal'
import { ItemizeExpenseModal, type ItemizeResult } from './components/ItemizeExpenseModal'
import { Button } from './components/Button'
import { useAppStore } from './store/useAppStore'
import { setTokenGetter } from './lib/authToken'
import { upsertMe, type ScanReceiptResult } from './lib/api'
import { buildExpenseDraft, type ExpenseDraft } from './lib/receiptDraft'

interface ItemizeContext {
  draft: ExpenseDraft
  items: ScanReceiptResult['items']
  fees: number
  discounts: number
  total: number
}

function App() {
  const {
    isLoading: authLoading,
    isAuthenticated,
    getAccessTokenSilently,
    user,
  } = useAuth0()

  const load = useAppStore((s) => s.load)
  const friends = useAppStore((s) => s.friends)
  const loading = useAppStore((s) => s.loading)
  const loadError = useAppStore((s) => s.error)
  const addExpense = useAppStore((s) => s.addExpense)

  const [addExpenseFriendId, setAddExpenseFriendId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft | null>(null)
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [itemizeContext, setItemizeContext] = useState<ItemizeContext | null>(null)

  // Must run before any effect that calls the API, so requests already have
  // a token getter available.
  useEffect(() => {
    setTokenGetter(isAuthenticated ? getAccessTokenSilently : null)
  }, [isAuthenticated, getAccessTokenSilently])

  useEffect(() => {
    if (isAuthenticated && user) {
      upsertMe({ name: user.name, email: user.email, picture: user.picture }).catch(
        () => {
          // best-effort — a failed profile sync shouldn't block the rest of the app
        },
      )
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    if (isAuthenticated) load()
  }, [isAuthenticated, load])

  function openAddExpense(friendId?: string) {
    setAddExpenseFriendId(friendId ?? null)
    setExpenseDraft(null)
    setModalOpen(true)
  }

  function openScanReceipt() {
    setScanModalOpen(true)
  }

  function handleScanned(result: ScanReceiptResult) {
    setScanModalOpen(false)
    const draft = buildExpenseDraft(result)
    if (friends.length > 0 && result.items.length > 0) {
      setItemizeContext({
        draft,
        items: result.items,
        fees: result.fees,
        discounts: result.discounts,
        total: result.total,
      })
      return
    }
    setAddExpenseFriendId(null)
    setExpenseDraft(draft)
    setModalOpen(true)
  }

  function handleScanManualFallback() {
    setScanModalOpen(false)
    openAddExpense()
  }

  function handleItemizeConfirm({ friendId, myShare, friendShare }: ItemizeResult) {
    if (!itemizeContext) return
    setExpenseDraft({
      ...itemizeContext.draft,
      split: { splitType: 'exact', myShare, friendShare },
    })
    setAddExpenseFriendId(friendId)
    setItemizeContext(null)
    setModalOpen(true)
  }

  function handleItemizeSkip() {
    if (!itemizeContext) return
    setExpenseDraft(itemizeContext.draft)
    setAddExpenseFriendId(null)
    setItemizeContext(null)
    setModalOpen(true)
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[#8a8593]">
        Carregando...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  if (loading && friends.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[#8a8593]">
        Carregando...
      </div>
    )
  }

  if (loadError && friends.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-[#8a8593]">
          Não foi possível carregar seus dados: {loadError}
        </p>
        {/* Reload completo (não só load() de novo): se a causa foi um token
            inválido/expirado, refazer a mesma chamada com o mesmo token em
            memória nunca vai funcionar — precisa de uma sessão nova. */}
        <Button onClick={() => window.location.reload()}>Tentar de novo</Button>
      </div>
    )
  }

  return (
    <>
      <Routes>
        <Route element={<Layout openAddExpense={openAddExpense} openScanReceipt={openScanReceipt} />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/friends/:friendId" element={<FriendDetail />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/invites" element={<Invites />} />
        </Route>
      </Routes>

      {scanModalOpen && (
        <ScanReceiptModal
          onClose={() => setScanModalOpen(false)}
          onScanned={handleScanned}
          onManualFallback={handleScanManualFallback}
        />
      )}

      {itemizeContext && (
        <ItemizeExpenseModal
          friends={friends}
          items={itemizeContext.items}
          fees={itemizeContext.fees}
          discounts={itemizeContext.discounts}
          total={itemizeContext.total}
          onConfirm={handleItemizeConfirm}
          onSkip={handleItemizeSkip}
        />
      )}

      {modalOpen && (
        <AddExpenseModal
          friends={friends}
          defaultFriendId={addExpenseFriendId ?? undefined}
          draft={expenseDraft ?? undefined}
          onClose={() => setModalOpen(false)}
          onSubmit={addExpense}
        />
      )}
    </>
  )
}

export default App
