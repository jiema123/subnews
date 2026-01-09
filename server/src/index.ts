import { Hono, Context, Next } from 'hono'
import { cors } from 'hono/cors'
import { User, Subscription, PushLog } from './types'

type Bindings = {
  SUBNEWS_KV: KVNamespace
  GEMINI_API_KEY: string
  JINA_API_KEY: string
}

type Variables = {
  user: User
}

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

app.use('*', cors())

// Auth Middleware (Simple token-based for session)
const auth = async (c: Context<{ Bindings: Bindings, Variables: Variables }>, next: Next) => {
  const token = c.req.header('Authorization')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  const userJson = await c.env.SUBNEWS_KV.get(`user_profile:${token}`)
  if (!userJson) return c.json({ error: 'Unauthorized' }, 401)

  c.set('user', JSON.parse(userJson))
  await next()
}

// --- Auth Routes ---
app.post('/api/auth/register', async (c) => {
  const { email, password } = await c.req.json()
  const exists = await c.env.SUBNEWS_KV.get(`user_profile:${email}`)
  if (exists) return c.json({ error: 'User already exists' }, 400)

  const newUser: User = { email, passwordHash: password }
  await c.env.SUBNEWS_KV.put(`user_profile:${email}`, JSON.stringify(newUser))
  return c.json({ success: true })
})

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json()
  const userJson = await c.env.SUBNEWS_KV.get(`user_profile:${email}`)
  if (!userJson) return c.json({ error: 'User not found' }, 404)

  const user: User = JSON.parse(userJson)
  if (user.passwordHash !== password) return c.json({ error: 'Invalid password' }, 401)

  // Use email as token for simplicity in this demo
  return c.json({ token: email })
})

// --- Subscription Routes ---
app.get('/api/subs', auth, async (c) => {
  const email = c.req.header('Authorization')
  const { keys } = await c.env.SUBNEWS_KV.list({ prefix: `sub:${email}:` })
  const subs = await Promise.all(keys.map(async (k: { name: string }) => {
    const data = await c.env.SUBNEWS_KV.get(k.name)
    return data ? JSON.parse(data) : null
  }))
  return c.json(subs.filter(Boolean))
})

app.post('/api/subs', auth, async (c) => {
  const email = c.req.header('Authorization')
  const data = await c.req.json()
  const id = crypto.randomUUID()
  const newSub: Subscription = { ...data, id, userId: email, isActive: true }
  await c.env.SUBNEWS_KV.put(`sub:${email}:${id}`, JSON.stringify(newSub))
  return c.json(newSub)
})

app.put('/api/subs/:id', auth, async (c) => {
  const email = c.req.header('Authorization')
  const id = c.req.param('id')
  const data = await c.req.json()
  await c.env.SUBNEWS_KV.put(`sub:${email}:${id}`, JSON.stringify({ ...data, id, userId: email }))
  return c.json({ success: true })
})

app.delete('/api/subs/:id', auth, async (c) => {
  const email = c.req.header('Authorization')
  const id = c.req.param('id')
  await c.env.SUBNEWS_KV.delete(`sub:${email}:${id}`)
  return c.json({ success: true })
})

// --- Logs ---
app.get('/api/logs', auth, async (c) => {
  const email = c.req.header('Authorization')
  const { keys } = await c.env.SUBNEWS_KV.list({ prefix: `log:${email}:`, limit: 50 })
  const logs = await Promise.all(keys.map(async (k: { name: string }) => {
    const data = await c.env.SUBNEWS_KV.get(k.name)
    return data ? JSON.parse(data) : null
  }))
  return c.json(logs.filter(Boolean).reverse())
})

// --- Manual Trigger / Test ---
app.post('/api/subs/:id/test', auth, async (c) => {
  const email = c.req.header('Authorization')
  const id = c.req.param('id')
  const subJson = await c.env.SUBNEWS_KV.get(`sub:${email}:${id}`)
  if (!subJson) return c.json({ error: 'Not found' }, 404)

  const sub: Subscription = JSON.parse(subJson)
  const result = await runTask(sub, c.env)
  return c.json(result)
})

app.post('/api/subs/preview', auth, async (c) => {
  const data = await c.req.json()
  const result = await runTask(data, c.env, true)
  return c.json(result)
})

// --- Core Logic ---
async function runTask(sub: any, env: Bindings, isPreview = false) {
  try {
    // 1. Handle dynamic URL (optional AI step)
    let targetUrl = sub.url
    const now = new Date()
    const year = now.getFullYear().toString()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    const date = now.toISOString().split('T')[0]

    targetUrl = targetUrl
      .replace(/{{date}}/g, date)
      .replace(/{{year}}/g, year)
      .replace(/{{month}}/g, month)
      .replace(/{{day}}/g, day)

    console.log(`[${sub.id || 'preview'}] Target URL: ${targetUrl}`)

    // 2. Fetch via jina
    const jinaUrl = `https://r.jina.ai/${targetUrl}`
    console.log(`[${sub.id}] Fetching Jina: ${jinaUrl}`)
    const contentResp = await fetch(jinaUrl, {
      headers: {
        'Authorization': `Bearer ${env.JINA_API_KEY}`
      }
    })
    console.log(`[${sub.id}] Jina Status: ${contentResp.status}`)
    const markdown = await contentResp.text()
    console.log(`[${sub.id}] Jina Content Length: ${markdown.length}`)

    // 3. AI Interpetation
    const geminiUrl = 'https://gemini-api.21588.org/v1beta/openai/chat/completions';
    const geminiPayload = {
      model: 'gemini-3-flash-preview',
      messages: [
        { role: 'system', content: 'You are a professional news editor. Summarize the following content according to user requirements.' },
        { role: 'user', content: `Format requirements: ${sub.template}\n\nContent:\n${markdown.substring(0, 50000)}` }
      ]
    };

    console.log(`[${sub.id}] >>> Requesting Gemini API: ${geminiUrl}`);
    console.log(`[${sub.id}] >>> Gemini Payload (Simplified):`, JSON.stringify({
      ...geminiPayload,
      messages: geminiPayload.messages.map(m => ({
        ...m,
        content: m.content.length > 100 ? m.content.substring(0, 100) + '...[truncated]' : m.content
      }))
    }, null, 2));

    const aiResp = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.GEMINI_API_KEY}`
      },
      body: JSON.stringify(geminiPayload)
    })

    const aiData: any = await aiResp.json()
    console.log(`[${sub.id}] <<< Gemini Status: ${aiResp.status}`)

    // Log response body (simplified if success, full if error)
    if (aiResp.ok) {
      // Use Deep Copy to strictly separate log data from actual logic data
      // avoiding mutation of aiData which is used later for sending the webhook
      const simpleLog = JSON.parse(JSON.stringify(aiData));
      if (simpleLog.choices && simpleLog.choices[0] && simpleLog.choices[0].message) {
        simpleLog.choices[0].message.content = simpleLog.choices[0].message.content.substring(0, 100) + '...[truncated]';
      }
      console.log(`[${sub.id}] <<< Gemini Response (Simplified):`, JSON.stringify(simpleLog, null, 2));
    } else {
      console.error(`[${sub.id}] <<< Gemini Error Body:`, JSON.stringify(aiData, null, 2))
    }

    if (!aiResp.ok || !aiData.choices || !aiData.choices[0]) {
      throw new Error(`AI API Error: ${aiResp.status} - ${JSON.stringify(aiData)}`)
    }

    const finalContent = aiData.choices[0].message.content
    console.log(`[${sub.id || 'preview'}] AI Generated Content (${finalContent.length} chars)`)

    // 4. Push to Webhook
    let pushStatus: 'success' | 'failure' | 'skipped' = 'success'
    let pushError = ''
    let webhookResponse = ''

    if (sub.webhook) {
      try {
        console.log(`[${sub.id || 'preview'}] Sending Webhook to ${sub.platform}...`)
        const resp = await sendWebhook(sub.webhook, sub.platform, finalContent)
        webhookResponse = await resp.text()
        console.log(`[${sub.id || 'preview'}] Webhook Success: ${webhookResponse}`)
      } catch (e: any) {
        console.error(`[${sub.id || 'preview'}] Webhook Failed: ${e.message}`)
        pushStatus = 'failure'
        pushError = e.message
      }
    } else {
      pushStatus = 'skipped'
    }

    if (isPreview) {
      return {
        status: 'success',
        content: finalContent,
        webhookStatus: pushStatus,
        webhookError: pushError,
        webhookResponse: webhookResponse
      }
    }

    // 5. Log
    const log: PushLog = {
      id: crypto.randomUUID(),
      userId: sub.userId,
      taskId: sub.id,
      taskName: sub.name,
      content: finalContent,
      status: pushStatus,
      error: pushError,
      timestamp: Date.now()
    }
    await env.SUBNEWS_KV.put(`log:${sub.userId}:${log.timestamp}`, JSON.stringify(log))

    return log
  } catch (err: any) {
    return { status: 'failure', error: err.message }
  }
}

async function sendWebhook(url: string, platform: string, content: string) {
  let body: any = {}
  if (platform === 'wechat') {
    body = { msgtype: 'markdown_v2', markdown_v2: { content: content } }
  } else if (platform === 'dingtalk') {
    body = { msgtype: 'markdown', markdown: { title: 'SubNews Update', text: content } }
  } else if (platform === 'feishu') {
    body = { msg_type: 'interactive', card: { header: { title: { tag: 'plain_text', content: 'SubNews Update' } }, elements: [{ tag: 'markdown', content: content }] } }
  } else {
    // Basic fallback for others
    body = { msgtype: 'text', text: { content: content } }
  }

  console.log(`[Webhook Debug] CURL command for ${platform}:`);
  console.log(`curl '${url}' -X POST -H 'Content-Type: application/json' -d '${JSON.stringify(body)}'`);

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!resp.ok) throw new Error(`Webhook failed: ${resp.statusText}`)
  return resp
}


// --- Scheduler ---
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    console.log('[Scheduler] Triggered at', new Date().toISOString());
    const { keys } = await env.SUBNEWS_KV.list({ prefix: 'sub:' })

    const now = new Date(); // Current execution time

    for (const key of keys) {
      const subJson = await env.SUBNEWS_KV.get(key.name)
      if (subJson) {
        const sub: Subscription = JSON.parse(subJson)
        if (sub.isActive) {
          try {
            // Convert to Shanghai Time
            const date = new Date();
            const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
            const shDate = new Date(utc + (3600000 * 8));

            const currentYear = shDate.getFullYear();
            const currentMonth = String(shDate.getMonth() + 1).padStart(2, '0');
            const currentDay = String(shDate.getDate()).padStart(2, '0');
            const currentHour = String(shDate.getHours()).padStart(2, '0');
            const currentMinute = String(shDate.getMinutes()).padStart(2, '0');

            // Format: HH:mm
            const currentTimeStr = `${currentHour}:${currentMinute}`;
            // Format: YYYY-MM-DDTHH:mm
            const currentFullStr = `${currentYear}-${currentMonth}-${currentDay}T${currentHour}:${currentMinute}`;

            console.log(`[Scheduler] Checking ${sub.name}: Type=${sub.scheduleType}, Time=${sub.scheduleTime}, Current=${currentFullStr}`);

            let shouldRun = false;

            if (sub.scheduleType === 'daily') {
              if (sub.scheduleTime === currentTimeStr) {
                // Check if already run today to handle potential overlaps or restarts
                const lastRunDate = sub.lastRun ? new Date(sub.lastRun) : null;
                const lastRunDateStr = lastRunDate ?
                  `${lastRunDate.getFullYear()}-${String(lastRunDate.getMonth() + 1).padStart(2, '0')}-${String(lastRunDate.getDate()).padStart(2, '0')}`
                  : '';
                const todayStr = `${currentYear}-${currentMonth}-${currentDay}`;

                if (lastRunDateStr !== todayStr) {
                  shouldRun = true;
                } else {
                  console.log(`[Scheduler] Skip ${sub.name}: Already run today.`);
                }
              }
            } else if (sub.scheduleType === 'once') {
              // Exact match for "YYYY-MM-DDTHH:mm"
              if (sub.scheduleTime === currentFullStr) {
                if (!sub.lastRun) {
                  shouldRun = true;
                } else {
                  console.log(`[Scheduler] Skip ${sub.name}: Already run once.`);
                }
              }
            }

            if (shouldRun) {
              console.log(`[Scheduler] Running task ${sub.name}`);
              // Update lastRun first to prevent double execution if possible (though KV is eventually consistent)
              sub.lastRun = Date.now();
              await env.SUBNEWS_KV.put(`sub:${sub.userId}:${sub.id}`, JSON.stringify(sub));

              ctx.waitUntil(runTask(sub, env));
            }

          } catch (e) {
            console.error(`[Scheduler] Error checking schedule for ${sub.name}: ${(e as Error).message}`);
          }
        }
      }
    }
  }
}

