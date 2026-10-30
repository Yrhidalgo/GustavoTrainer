/* Subscription management for a trainer's own clients.
   Real server.js in a child process, per test, with its own DATA_DIR. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const API = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function mintSession(uid, secret, sv = 0) {
  const payload = `${uid}:${Date.now() + 86400000}:${sv}`;
  return payload + '.' + crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

async function startServer(t, secret, users) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-sub-'));
  fs.writeFileSync(path.join(dataDir, 'secret'), secret, { mode: 0o600 });
  fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({
    users: users || [{ id: 't1', name: 'Trainer One', created: new Date().toISOString() }],
    creds: [], subs: [], invites: [], clients: [], subscriptions: [], payments: [], deviceLinks: []
  }));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: API, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '0', DATA_DIR: dataDir, ORIGIN: 'http://localhost:8080', RP_ID: 'localhost' }
  });
  const h = { api: '', log: '', dataDir, secret };
  child.stdout.on('data', d => h.log += d);
  child.stderr.on('data', d => h.log += d);
  t.after(() => { child.kill('SIGKILL'); fs.rmSync(dataDir, { recursive: true, force: true }); });
  return new Promise((resolve, reject) => {
    const give = setTimeout(() => reject(new Error('server never announced a port')), 20000);
    const look = d => {
      h.log += d;
      const m = /gym-api on :(\d+)/.exec(h.log);
      if (!m) return;
      clearTimeout(give);
      child.stdout.off('data', look);
      h.port = +m[1];
      h.api = `http://127.0.0.1:${h.port}`;
      resolve(h);
    };
    child.stdout.on('data', look);
    child.once('exit', code => { clearTimeout(give); reject(new Error(`server exited (${code})`)); });
  });
}

const send = (h, method, p, headers, body) => fetch(`${h.api}${p}`, { method, headers, body });
const status = async (h, method, p, headers, body) => {
  const r = await send(h, method, p, headers, body);
  let parsed;
  try { parsed = await r.json(); } catch { parsed = null; }
  return { status: r.status, body: parsed };
};
const cookie = (h, uid) => ({ Cookie: `gymsid=${mintSession(uid, h.secret)}`, 'Content-Type': 'application/json' });

test('unauthenticated requests are refused', async t => {
  const h = await startServer(t, 's1');
  const routes = [
    ['GET', '/api/clients'], ['POST', '/api/clients'],
    ['GET', '/api/subscriptions'], ['POST', '/api/subscriptions']
  ];
  for (const [method, p] of routes) {
    const r = await status(h, method, p, { 'Content-Type': 'application/json' }, '{}');
    assert.equal(r.status, 401, `${method} ${p} without session`);
  }
});

test('trainer cannot see another trainer\'s clients or subscriptions', async t => {
  const h = await startServer(t, 's2', [
    { id: 't1', name: 'Trainer One' },
    { id: 't2', name: 'Trainer Two' }
  ]);
  const a = cookie(h, 't1');
  const b = cookie(h, 't2');
  const c = await status(h, 'POST', '/api/clients', a, JSON.stringify({ name: 'Client A' }));
  assert.equal(c.status, 200, JSON.stringify(c.body));
  const clientId = c.body.client.id;
  const r = await status(h, 'GET', '/api/clients/' + clientId, b, null, null);
  assert.equal(r.status, 404, 'other trainer reads client');
  const s = await status(h, 'POST', '/api/subscriptions', b, JSON.stringify({
    clientId, planName: 'Plan', price: 10, currency: 'USD', durationMonths: 1, startDate: '2026-01-01'
  }));
  assert.equal(s.status, 404, 'other trainer subscribes to client');
  const list = await status(h, 'GET', '/api/clients', a, null, null);
  assert.equal(list.status, 200);
  assert.equal(list.body.clients.length, 1);
  assert.equal(list.body.clients[0].id, clientId);
});

test('client create, read, update, delete', async t => {
  const h = await startServer(t, 's3');
  const a = cookie(h, 't1');
  let r = await status(h, 'POST', '/api/clients', a, JSON.stringify({ name: 'Ana', email: 'ana@example.com', phone: '555' }));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.client.name, 'Ana');
  assert.equal(r.body.client.email, 'ana@example.com');
  const clientId = r.body.client.id;

  r = await status(h, 'GET', '/api/clients/' + clientId, a, null, null);
  assert.equal(r.status, 200);
  assert.equal(r.body.client.name, 'Ana');

  r = await status(h, 'PUT', '/api/clients/' + clientId, a, JSON.stringify({ name: 'Ana López', active: false }));
  assert.equal(r.status, 200);
  assert.equal(r.body.client.name, 'Ana López');
  assert.equal(r.body.client.active, false);

  r = await status(h, 'PUT', '/api/clients/' + clientId, a, JSON.stringify({ name: '' }));
  assert.equal(r.status, 400);

  r = await status(h, 'GET', '/api/clients?q=Ana', a, null, null);
  assert.equal(r.status, 200);
  assert.equal(r.body.clients.length, 1);
  r = await status(h, 'GET', '/api/clients?q=ZZZ', a, null, null);
  assert.equal(r.status, 200);
  assert.equal(r.body.clients.length, 0);

  r = await status(h, 'DELETE', '/api/clients/' + clientId, a, null, null);
  assert.equal(r.status, 400);

  r = await status(h, 'POST', '/api/subscriptions', a, JSON.stringify({
    clientId, planName: 'Mensual', price: 29.99, currency: 'USD', durationMonths: 1, startDate: '2026-01-01'
  }));
  assert.equal(r.status, 200);
  r = await status(h, 'DELETE', '/api/clients/' + clientId, a, null, null);
  assert.equal(r.status, 400);

  const subId = r.body.subscription.id;
  r = await status(h, 'DELETE', '/api/subscriptions/' + subId, a, null, null);
  assert.equal(r.status, 200);
  r = await status(h, 'DELETE', '/api/clients/' + clientId, a, null, null);
  assert.equal(r.status, 200);

  r = await status(h, 'GET', '/api/clients/' + clientId, a, null, null);
  assert.equal(r.status, 404);
});

test('subscription create, read, update, renew, delete', async t => {
  const h = await startServer(t, 's4');
  const a = cookie(h, 't1');
  const c = await status(h, 'POST', '/api/clients', a, JSON.stringify({ name: 'Beto' }));
  assert.equal(c.status, 200);
  const clientId = c.body.client.id;

  let r = await status(h, 'POST', '/api/subscriptions', a, JSON.stringify({
    clientId, planName: 'Mensual', price: 29.99, currency: 'USD', durationMonths: 1, startDate: '2026-01-01'
  }));
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.subscription.status, 'active');
  assert.equal(r.body.subscription.price, 29.99);
  const subId = r.body.subscription.id;
  const end1 = r.body.subscription.endDate;

  r = await status(h, 'POST', '/api/subscriptions', a, JSON.stringify({
    clientId, planName: 'X', price: -5, durationMonths: 1, startDate: '2026-01-01'
  }));
  assert.equal(r.status, 400);
  r = await status(h, 'POST', '/api/subscriptions', a, JSON.stringify({
    clientId, planName: 'X', price: 5, durationMonths: 1, startDate: 'not-a-date'
  }));
  assert.equal(r.status, 400);

  r = await status(h, 'GET', '/api/subscriptions/' + subId, a, null, null);
  assert.equal(r.status, 200);
  assert.equal(r.body.subscription.client.name, 'Beto');

  r = await status(h, 'GET', '/api/subscriptions?status=active', a, null, null);
  assert.equal(r.status, 200);
  assert.equal(r.body.subscriptions.length, 1);

  r = await status(h, 'PUT', '/api/subscriptions/' + subId, a, JSON.stringify({
    endDate: '2026-01-01', startDate: '2026-02-01'
  }));
  assert.equal(r.status, 400);

  r = await status(h, 'PUT', '/api/subscriptions/' + subId, a, JSON.stringify({ planName: 'Trimestral', price: 79.99 }));
  assert.equal(r.status, 200);
  assert.equal(r.body.subscription.planName, 'Trimestral');
  assert.equal(r.body.subscription.price, 79.99);

  r = await status(h, 'POST', '/api/subscriptions/' + subId + '/renew', a, JSON.stringify({
    planName: 'Trimestral', price: 79.99, currency: 'USD', durationMonths: 3
  }));
  assert.equal(r.status, 200);
  assert.equal(r.body.subscription.renewals.length, 1);
  assert.equal(r.body.subscription.renewals[0].previousEndDate, end1);
  assert.equal(r.body.subscription.status, 'active');

  r = await status(h, 'DELETE', '/api/subscriptions/' + subId, a, null, null);
  assert.equal(r.status, 200);
  r = await status(h, 'GET', '/api/subscriptions/' + subId, a, null, null);
  assert.equal(r.status, 404);
});

test('payments pending and verified', async t => {
  const h = await startServer(t, 's5');
  const a = cookie(h, 't1');
  const c = await status(h, 'POST', '/api/clients', a, JSON.stringify({ name: 'Carla' }));
  const clientId = c.body.client.id;
  const s = await status(h, 'POST', '/api/subscriptions', a, JSON.stringify({
    clientId, planName: 'Plan', price: 10, currency: 'USD', durationMonths: 1, startDate: '2026-01-01'
  }));
  const subId = s.body.subscription.id;

  let r = await status(h, 'POST', '/api/subscriptions/' + subId + '/payments', a, JSON.stringify({
    amount: 10, currency: 'USD', method: 'transfer', reference: 'ref-1'
  }));
  assert.equal(r.status, 200);
  assert.equal(r.body.payment.status, 'pending');
  assert.equal(r.body.payment.verifiedAt, null);
  const paymentId = r.body.payment.id;

  r = await status(h, 'POST', '/api/subscriptions/' + subId + '/payments', a, JSON.stringify({
    amount: 10, currency: 'USD', method: 'cash', status: 'verified'
  }));
  assert.equal(r.status, 200);
  assert.equal(r.body.payment.status, 'verified');
  assert.notEqual(r.body.payment.verifiedAt, null);

  r = await status(h, 'GET', '/api/subscriptions/' + subId + '/payments', a, null, null);
  assert.equal(r.status, 200);
  assert.equal(r.body.payments.length, 2);

  r = await status(h, 'PUT', '/api/subscriptions/' + subId + '/payments/' + paymentId, a, JSON.stringify({ status: 'verified' }));
  assert.equal(r.status, 200);
  assert.equal(r.body.payment.status, 'verified');
  assert.notEqual(r.body.payment.verifiedAt, null);

  r = await status(h, 'PUT', '/api/subscriptions/' + subId + '/payments/' + paymentId, a, JSON.stringify({ status: 'paid' }));
  assert.equal(r.status, 400);

  r = await status(h, 'DELETE', '/api/subscriptions/' + subId + '/payments/' + paymentId, a, null, null);
  assert.equal(r.status, 200);
  r = await status(h, 'GET', '/api/subscriptions/' + subId + '/payments', a, null, null);
  assert.equal(r.body.payments.length, 1);
});

test('persistence across server restart', async t => {
  const secret = 's6';
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-sub-persist-'));
  fs.writeFileSync(path.join(dataDir, 'secret'), secret, { mode: 0o600 });
  fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({
    users: [{ id: 't1', name: 'Trainer One' }],
    creds: [], subs: [], invites: [], clients: [], subscriptions: [], payments: [], deviceLinks: []
  }));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: API, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '0', DATA_DIR: dataDir, ORIGIN: 'http://localhost:8080', RP_ID: 'localhost' }
  });
  const h = { api: '', log: '', dataDir, secret };
  child.stdout.on('data', d => h.log += d);
  child.stderr.on('data', d => h.log += d);
  t.after(() => { child.kill('SIGKILL'); fs.rmSync(dataDir, { recursive: true, force: true }); });
  h.port = await new Promise((resolve, reject) => {
    const give = setTimeout(() => reject(new Error('no port')), 20000);
    const look = d => { h.log += d; const m = /gym-api on :(\d+)/.exec(h.log); if (m) { clearTimeout(give); resolve(+m[1]); } };
    child.stdout.on('data', look);
    child.once('exit', code => { clearTimeout(give); reject(new Error('exit ' + code)); });
  });
  h.api = `http://127.0.0.1:${h.port}`;
  const a = cookie(h, 't1');

  const c = await status(h, 'POST', '/api/clients', a, JSON.stringify({ name: 'Persist Client' }));
  assert.equal(c.status, 200);
  const clientId = c.body.client.id;
  const s = await status(h, 'POST', '/api/subscriptions', a, JSON.stringify({
    clientId, planName: 'Plan', price: 10, currency: 'USD', durationMonths: 1, startDate: '2026-01-01'
  }));
  assert.equal(s.status, 200);
  const subId = s.body.subscription.id;

  child.kill('SIGKILL');
  await new Promise(r => setTimeout(r, 500));
  const child2 = spawn(process.execPath, ['server.js'], {
    cwd: API, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '0', DATA_DIR: dataDir, ORIGIN: 'http://localhost:8080', RP_ID: 'localhost' }
  });
  const h2 = { api: '', log: '', dataDir, secret };
  child2.stdout.on('data', d => h2.log += d);
  child2.stderr.on('data', d => h2.log += d);
  t.after(() => { child2.kill('SIGKILL'); });
  h2.port = await new Promise((resolve, reject) => {
    const give = setTimeout(() => reject(new Error('no port 2')), 20000);
    const look = d => { h2.log += d; const m = /gym-api on :(\d+)/.exec(h2.log); if (m) { clearTimeout(give); resolve(+m[1]); } };
    child2.stdout.on('data', look);
    child2.once('exit', code => { clearTimeout(give); reject(new Error('exit2 ' + code)); });
  });
  child2.stdout.on('data', look);
  h2.api = `http://127.0.0.1:${h2.port}`;
  const a2 = cookie(h2, 't1');

  const r = await status(h2, 'GET', '/api/clients', a2, null, null);
  assert.equal(r.status, 200);
  assert.equal(r.body.clients.length, 1);
  assert.equal(r.body.clients[0].name, 'Persist Client');
  const s2 = await status(h2, 'GET', '/api/subscriptions', a2, null, null);
  assert.equal(s2.status, 200);
  assert.equal(s2.body.subscriptions.length, 1);
  assert.equal(s2.body.subscriptions[0].id, subId);
  child2.kill('SIGKILL');
});

test('write error does not corrupt', async t => {
  const h = await startServer(t, 's7');
  const a = cookie(h, 't1');
  const c = await status(h, 'POST', '/api/clients', a, JSON.stringify({ name: 'OK' }));
  assert.equal(c.status, 200);
  const r = await status(h, 'GET', '/api/clients', a, null, null);
  assert.equal(r.status, 200);
  assert.equal(r.body.clients.length, 1);
});
