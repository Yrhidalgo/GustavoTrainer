import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { todayISO, fmtDate } from '../lib/format.js'
import { Section, Row, Switch, Button, TextField, SearchField, SelectRow } from '../components/ui.jsx'
import Icon from '../components/Icon.jsx'

const STATUS_OPTS = [
  { value: 'active', label: t('Active') },
  { value: 'expired', label: t('Expired') },
  { value: 'cancelled', label: t('Cancelled') }
]

const PAYMENT_STATUS_OPTS = [
  { value: 'pending', label: t('Pending') },
  { value: 'verified', label: t('Verified') }
]

function emptyClient() { return { name: '', email: '', phone: '', active: true } }
function emptySub() { return { clientId: '', planName: '', price: '', currency: 'USD', durationMonths: '1', startDate: todayISO() } }
function emptyPayment() { return { amount: '', currency: 'USD', method: 'manual', reference: '', status: 'pending' } }

export default function Subscriptions() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const ui = useUI.getState()
  const toast = (m, kind = 'ok') => ui.toast(m, kind)
  const ref = useRef()

  const [clients, setClients] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [mode, setMode] = useState('clients')
  const [selectedClient, setSelectedClient] = useState(null)
  const [selectedSub, setSelectedSub] = useState(null)

  const [clientForm, setClientForm] = useState(emptyClient())
  const [subForm, setSubForm] = useState(emptySub())
  const [payForm, setPayForm] = useState(emptyPayment())

  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const headers = { 'Content-Type': 'application/json' }

  const load = useCallback(async () => {
    setError(null)
    try {
      const [cResp, sResp] = await Promise.all([
        api('/api/clients', { method: 'GET', headers }),
        api('/api/subscriptions', { method: 'GET', headers })
      ])
      setClients(cResp.clients || [])
      setSubscriptions(sResp.subscriptions || [])
    } catch (e) {
      setError(e.message || t('Could not load data'))
      toast(e.message || t('Could not load data'), 'bad')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filteredClients = clients.filter(c => {
    const q = search.toLowerCase()
    if (!q) return true
    const hay = `${c.name || ''} ${c.email || ''} ${c.phone || ''}`.toLowerCase()
    return hay.includes(q)
  })
  const clientSubs = selectedClient
    ? subscriptions.filter(s => s.clientId === selectedClient.id).sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
    : []
  const filteredSubs = clientSubs.filter(s => !statusFilter || s.status === statusFilter)

  const handleClientSubmit = async (e) => {
    e.preventDefault()
    try {
      if (clientForm.id) {
        await api(`/api/clients/${clientForm.id}`, {
          method: 'PUT', headers,
          body: JSON.stringify({ name: clientForm.name, email: clientForm.email, phone: clientForm.phone, active: clientForm.active })
        })
        toast(t('Client saved'))
      } else {
        const res = await api('/api/clients', { method: 'POST', headers, body: JSON.stringify(clientForm) })
        setClients([...clients, res.client])
        setClientForm(emptyClient())
        toast(t('Client created'))
      }
      setMode('clients')
      await load()
    } catch (e) {
      setError(e.message || t('Could not save client'))
      toast(e.message || t('Could not save client'), 'bad')
    }
  }

  const handleSubSubmit = async (e) => {
    e.preventDefault()
    try {
      const body = {
        clientId: subForm.clientId,
        planName: subForm.planName,
        price: +subForm.price || 0,
        currency: subForm.currency,
        durationMonths: +subForm.durationMonths || 1,
        startDate: subForm.startDate
      }
      if (subForm.id) {
        await api(`/api/subscriptions/${subForm.id}`, {
          method: 'PUT', headers, body: JSON.stringify(body)
        })
        toast(t('Subscription saved'))
      } else {
        const res = await api('/api/subscriptions', { method: 'POST', headers, body: JSON.stringify(body) })
        setSubscriptions([...subscriptions, res.subscription])
        setSubForm(emptySub())
        toast(t('Subscription created'))
      }
      setMode('clients')
      await load()
    } catch (e) {
      setError(e.message || t('Could not save subscription'))
      toast(e.message || t('Could not save subscription'), 'bad')
    }
  }

  const handlePaySubmit = async (e) => {
    e.preventDefault()
    try {
      const body = {
        amount: +payForm.amount || 0,
        currency: payForm.currency,
        method: payForm.method,
        reference: payForm.reference,
        status: payForm.status
      }
      await api(`/api/subscriptions/${selectedSub.id}/payments`, {
        method: 'POST', headers, body: JSON.stringify(body)
      })
      setPayForm(emptyPayment())
      toast(t('Payment recorded'))
      await loadPayments()
    } catch (e) {
      setError(e.message || t('Could not record payment'))
      toast(e.message || t('Could not record payment'), 'bad')
    }
  }

  const loadPayments = async () => {
    if (!selectedSub) return
    try {
      const res = await api(`/api/subscriptions/${selectedSub.id}/payments`, { method: 'GET', headers })
      setPayments(res.payments || [])
    } catch (e) {
      setPayments([])
    }
  }

  const verifyPayment = async (paymentId) => {
    try {
      await api(`/api/subscriptions/${selectedSub.id}/payments/${paymentId}`, {
        method: 'PUT', headers, body: JSON.stringify({ status: 'verified' })
      })
      toast(t('Payment verified'))
      await loadPayments()
    } catch (e) {
      toast(e.message || t('Could not verify payment'), 'bad')
    }
  }

  const deletePayment = async (paymentId) => {
    if (!window.confirm(t('Delete this payment record?'))) return
    try {
      await api(`/api/subscriptions/${selectedSub.id}/payments/${paymentId}`, { method: 'DELETE', headers })
      toast(t('Payment deleted'))
      await loadPayments()
    } catch (e) {
      toast(e.message || t('Could not delete payment'), 'bad')
    }
  }

  const renewSubscription = async () => {
    if (!selectedSub) return
    if (!window.confirm(t('Renew this subscription? A new period starts after the current expiry.'))) return
    try {
      const res = await api(`/api/subscriptions/${selectedSub.id}/renew`, {
        method: 'POST', headers,
        body: JSON.stringify({ planName: selectedSub.planName, price: selectedSub.price, currency: selectedSub.currency, durationMonths: selectedSub.durationMonths })
      })
      toast(t('Subscription renewed'))
      setSelectedSub(res.subscription)
      await load()
      await loadPayments()
    } catch (e) {
      toast(e.message || t('Could not renew subscription'), 'bad')
    }
  }

  const deleteClient = async (clientId) => {
    if (!window.confirm(t('Delete this client? Subscriptions must be removed first.'))) return
    try {
      await api(`/api/clients/${clientId}`, { method: 'DELETE', headers })
      toast(t('Client deleted'))
      setSelectedClient(null)
      setMode('clients')
      await load()
    } catch (e) {
      toast(e.message || t('Could not delete client'), 'bad')
    }
  }

  const deleteSubscription = async (subId) => {
    if (!window.confirm(t('Delete this subscription and its payments?'))) return
    try {
      await api(`/api/subscriptions/${subId}`, { method: 'DELETE', headers })
      toast(t('Subscription deleted'))
      setSelectedSub(null)
      await load()
    } catch (e) {
      toast(e.message || t('Could not delete subscription'), 'bad')
    }
  }

  if (loading) return (
    <div className="narrow page" style={{ padding: 24 }}>
      <h1>{t('Subscriptions')}</h1>
      <p className="muted">{t('Loading…')}</p>
    </div>
  )

  if (error) return (
    <div className="narrow page" style={{ padding: 24 }}>
      <h1>{t('Subscriptions')}</h1>
      <div className="alert bad">{error}</div>
      <Button onClick={() => { setError(null); load() }}>{t('Try again')}</Button>
    </div>
  )

  if (mode === 'clients') {
    return (
      <div className="narrow page" style={{ padding: 24 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>{t('Subscriptions')}</h1>
          <Button icon="plusCircle" onClick={() => { setClientForm(emptyClient()); setMode('clientEdit') }}>{t('New client')}</Button>
        </div>

        <SearchField value={search} onChange={e => setSearch(e.target.value)} onClear={() => setSearch('')}
          placeholder={t('Search clients…')} aria-label={t('Search clients')} />

        {filteredClients.length === 0 ? (
          <div className="sp-empty">{search ? t('No client matches “{0}”.', search) : t('No clients yet. Add one to get started.')}</div>
        ) : (
          <Section title={t('Clients')}>
            {filteredClients.map(c => (
              <Row key={c.id} title={c.name} subtitle={`${c.email || ''} ${c.phone || ''}`.trim() || t('No contact info')}
                accessory={c.active ? null : 'off'}
                onClick={() => { setSelectedClient(c); setMode('clientDetail') }} />
            ))}
          </Section>
        )}

        {clients.length > 0 && (
          <Section title={t('Subscriptions')}>
            {filteredSubs.length === 0 ? (
              <p className="muted">{t('No subscriptions.')}</p>
            ) : (
              filteredSubs.map(s => {
                const c = clients.find(x => x.id === s.clientId)
                return (
                  <Row key={s.id}
                    title={`${s.planName} · ${s.currency} ${Number(s.price || 0).toFixed(2)}`}
                    subtitle={`${c?.name || t('client')} · ${fmtDate(s.startDate)} → ${fmtDate(s.endDate)}`}
                    accessory={s.status === 'active' ? 'on' : s.status === 'expired' ? 'off' : 'paused'}
                    onClick={() => { setSelectedSub(s); setMode('subDetail') }} />
                )
              })
            )}
          </Section>
        )}
      </div>
    )
  }

  if (mode === 'clientDetail' && selectedClient) {
    const subs = selectedClient ? subscriptions.filter(s => s.clientId === selectedClient.id) : []
    return (
      <div className="narrow page" style={{ padding: 24 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
          <Button icon="chevronLeft" onClick={() => { setSelectedClient(null); setMode('clients') }}>{t('Clients')}</Button>
          <h1 style={{ margin: 0 }}>{selectedClient.name}</h1>
          <Button icon="pencil" onClick={() => { setClientForm({ ...selectedClient }); setMode('clientEdit') }}>{t('Edit')}</Button>
          <Button icon="trash" className="danger" onClick={() => deleteClient(selectedClient.id)}>{t('Delete')}</Button>
        </div>

        <Section title={t('Contact info')}>
          <Row title={t('Name')} value={selectedClient.name} />
          <Row title={t('E-mail')} value={selectedClient.email || '—'} />
          <Row title={t('Phone')} value={selectedClient.phone || '—'} />
          <Row title={t('Status')} value={selectedClient.active ? t('Active') : t('Inactive')} />
        </Section>

        <Section title={t('Subscriptions')}>
          <Button icon="plusCircle" onClick={() => { setSubForm({ ...emptySub(), clientId: selectedClient.id }); setMode('subEdit') }}>{t('New subscription')}</Button>
          {subs.length === 0 ? (
            <p className="muted">{t('No subscriptions for this client.')}</p>
          ) : (
            subs.map(s => (
              <Row key={s.id} title={s.planName}
                subtitle={`${s.currency} ${Number(s.price || 0).toFixed(2)} · ${fmtDate(s.startDate)} → ${fmtDate(s.endDate)} · ${t(s.status)}`}
                accessory={s.status === 'active' ? 'on' : 'off'}
                onClick={() => { setSelectedSub(s); setMode('subDetail') }} />
            ))
          )}
        </Section>
      </div>
    )
  }

  if (mode === 'clientEdit') {
    return (
      <div className="narrow page" style={{ padding: 24 }}>
        <Button icon="chevronLeft" onClick={() => setMode('clients')}>{t('Back')}</Button>
        <h1>{clientForm.id ? t('Edit client') : t('New client')}</h1>
        <form onSubmit={handleClientSubmit}>
          <Section title={t('Client details')}>
            <TextField label={t('Name')} value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} required />
            <TextField label={t('E-mail')} type="email" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} />
            <TextField label={t('Phone')} value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} />
            <Row title={t('Active')}>
              <Switch checked={clientForm.active !== false} onChange={v => setClientForm({ ...clientForm, active: v })} />
            </Row>
          </Section>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Button type="submit">{clientForm.id ? t('Save') : t('Create')}</Button>
            <Button type="button" variant="secondary" onClick={() => setMode('clients')}>{t('Cancel')}</Button>
          </div>
        </form>
      </div>
    )
  }

  if (mode === 'subDetail' && selectedSub) {
    const c = clients.find(x => x.id === selectedSub.clientId)
    return (
      <div className="narrow page" style={{ padding: 24 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
          <Button icon="chevronLeft" onClick={() => { setSelectedSub(null); setMode('clientDetail') }}>{t('Back')}</Button>
          <h1 style={{ margin: 0 }}>{selectedSub.planName}</h1>
          <Button icon="pencil" onClick={() => { setSubForm({ ...selectedSub }); setMode('subEdit') }}>{t('Edit')}</Button>
          <Button icon="refresh" onClick={renewSubscription}>{t('Renew')}</Button>
          <Button icon="trash" className="danger" onClick={() => deleteSubscription(selectedSub.id)}>{t('Delete')}</Button>
        </div>

        <Section title={t('Subscription')}>
          <Row title={t('Client')} value={c?.name || '—'} />
          <Row title={t('Plan')} value={selectedSub.planName} />
          <Row title={t('Price')} value={`${selectedSub.currency} ${Number(selectedSub.price || 0).toFixed(2)}`} />
          <Row title={t('Duration')} value={`${selectedSub.durationMonths} ${t('months')}`} />
          <Row title={t('Start')} value={fmtDate(selectedSub.startDate)} />
          <Row title={t('Expiry')} value={fmtDate(selectedSub.endDate)} />
          <Row title={t('Status')} value={t(selectedSub.status)} accessory={selectedSub.status === 'active' ? 'on' : 'off'} />
        </Section>

        <Section title={t('Payments')}>
          <Button icon="plusCircle" onClick={() => setMode('payEdit')}>{t('Record payment')}</Button>
          {payments.length === 0 ? (
            <p className="muted">{t('No payments recorded.')}</p>
          ) : (
            payments.map(p => (
              <Row key={p.id} title={`${p.method} · ${p.currency} ${Number(p.amount || 0).toFixed(2)}`}
                subtitle={`${fmtDate(p.createdAt)} · ${t(p.status)} ${p.reference ? '· ' + p.reference : ''}`.trim()}
                accessory={p.status === 'verified' ? 'on' : 'pending'} />
            ))
          )}
        </Section>

        {selectedSub.renewals && selectedSub.renewals.length > 0 && (
          <Section title={t('Renewals')}>
            {selectedSub.renewals.map((r, i) => (
              <Row key={i} title={`${r.planName} · ${r.currency} ${Number(r.price || 0).toFixed(2)}`}
                subtitle={`${fmtDate(r.at)} · ${t('from')} ${fmtDate(r.previousEndDate)}`} />
            ))}
          </Section>
        )}
      </div>
    )

  if (mode === 'subEdit') {
    return (
      <div className="narrow page" style={{ padding: 24 }}>
        <Button icon="chevronLeft" onClick={() => setMode('clientDetail')}>{t('Back')}</Button>
        <h1>{subForm.id ? t('Edit subscription') : t('New subscription')}</h1>
        <form onSubmit={handleSubSubmit}>
          <Section title={t('Plan')}>
            <SelectRow label={t('Client')} value={subForm.clientId}
              options={clients.map(c => ({ value: c.id, label: c.name }))}
              onChange={v => setSubForm({ ...subForm, clientId: v })} required />
            <TextField label={t('Plan name')} value={subForm.planName} onChange={e => setSubForm({ ...subForm, planName: e.target.value })} required />
            <TextField label={t('Price')} type="number" value={subForm.price} onChange={e => setSubForm({ ...subForm, price: e.target.value })} required />
            <SelectRow label={t('Currency')} value={subForm.currency}
              options={[{ value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }, { value: 'GBP', label: 'GBP' }]}
              onChange={v => setSubForm({ ...subForm, currency: v })} />
            <TextField label={t('Duration (months)')} type="number" value={subForm.durationMonths} onChange={e => setSubForm({ ...subForm, durationMonths: e.target.value })} required />
            <TextField label={t('Start date')} type="date" value={subForm.startDate} onChange={e => setSubForm({ ...subForm, startDate: e.target.value })} required />
          </Section>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Button type="submit">{subForm.id ? t('Save') : t('Create')}</Button>
            <Button type="button" variant="secondary" onClick={() => setMode('clientDetail')}>{t('Cancel')}</Button>
          </div>
        </form>
      </div>
    )
  }

  if (mode === 'payEdit' && selectedSub) {
    return (
      <div className="narrow page" style={{ padding: 24 }}>
        <Button icon="chevronLeft" onClick={() => setMode('subDetail')}>{t('Back')}</Button>
        <h1>{t('Record payment')}</h1>
        <form onSubmit={handlePaySubmit}>
          <Section title={t('Payment')}>
            <TextField label={t('Amount')} type="number" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} required />
            <SelectRow label={t('Currency')} value={payForm.currency}
              options={[{ value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }, { value: 'GBP', label: 'GBP' }]}
              onChange={v => setPayForm({ ...payForm, currency: v })} />
            <SelectRow label={t('Method')} value={payForm.method}
              options={[{ value: 'manual', label: t('Manual') }, { value: 'cash', label: t('Cash') }, { value: 'transfer', label: t('Transfer') }, { value: 'card', label: t('Card') }]}
              onChange={v => setPayForm({ ...payForm, method: v })} />
            <TextField label={t('Reference (optional)')} value={payForm.reference} onChange={e => setPayForm({ ...payForm, reference: e.target.value })} />
            <SelectRow label={t('Status')} value={payForm.status}
              options={PAYMENT_STATUS_OPTS}
              onChange={v => setPayForm({ ...payForm, status: v })} />
          </Section>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Button type="submit">{t('Record')}</Button>
            <Button type="button" variant="secondary" onClick={() => setMode('subDetail')}>{t('Cancel')}</Button>
          </div>
        </form>
      </div>
    )
  }

  return null
}
  }