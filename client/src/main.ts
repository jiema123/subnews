import './style.css'
import { api } from './api'

const app = document.querySelector<HTMLDivElement>('#app')!

// --- State ---
let currentView = api.token ? 'dashboard' : 'login';
let subscriptions: any[] = [];
let logs: any[] = [];

// --- Renderers ---

function render() {
  if (currentView === 'login') return renderLogin();
  if (currentView === 'dashboard') return renderDashboard();
  if (currentView === 'logs') return renderLogs();
}

function renderLogin() {
  app.innerHTML = `
    <div class="auth-container glass-card">
      <h1 class="title">SubNews</h1>
      <div id="auth-form">
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="email" placeholder="your@email.com">
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="password" placeholder="••••••••">
        </div>
        <button id="btn-login">Login</button>
        <button id="btn-show-reg" class="secondary" style="margin-top: 1rem;">Create Account</button>
      </div>
    </div>
  `;

  document.querySelector('#btn-login')?.addEventListener('click', async () => {
    const email = (document.querySelector('#email') as HTMLInputElement).value;
    const password = (document.querySelector('#password') as HTMLInputElement).value;
    try {
      const { token } = await api.auth.login({ email, password });
      api.setToken(token);
      currentView = 'dashboard';
      render();
    } catch (e: any) { alert(e.message); }
  });

  document.querySelector('#btn-show-reg')?.addEventListener('click', () => {
    renderRegister();
  });
}

function renderRegister() {
  const form = document.querySelector('#auth-form')!;
  form.innerHTML = `
    <div class="form-group">
      <label>Email</label>
      <input type="email" id="email" placeholder="your@email.com">
    </div>
    <div class="form-group">
      <label>Password</label>
      <input type="password" id="password" placeholder="••••••••">
    </div>
    <button id="btn-register">Register</button>
    <button id="btn-show-login" class="secondary" style="margin-top: 1rem;">Back to Login</button>
  `;

  document.querySelector('#btn-register')?.addEventListener('click', async () => {
    const email = (document.querySelector('#email') as HTMLInputElement).value;
    const password = (document.querySelector('#password') as HTMLInputElement).value;
    try {
      await api.auth.register({ email, password });
      alert('Success! Please login.');
      currentView = 'login';
      render();
    } catch (e: any) { alert(e.message); }
  });

  document.querySelector('#btn-show-login')?.addEventListener('click', () => {
    currentView = 'login';
    render();
  });
}

async function renderDashboard() {
  app.innerHTML = `
    <div class="nav">
      <h1 class="title" style="margin: 0;">SubNews</h1>
      <div>
        <button id="btn-show-logs" class="secondary" style="width: auto; margin-right: 1rem;">Logs</button>
        <button id="btn-logout" class="secondary" style="width: auto;">Logout</button>
      </div>
    </div>
    
    <div class="dashboard-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
      <h2>Your Subscriptions</h2>
      <button id="btn-add-task" style="width: auto;">+ New Task</button>
    </div>

    <div class="task-grid" id="task-list">
      <div style="color: var(--text-muted)">Loading...</div>
    </div>
  `;

  document.querySelector('#btn-logout')?.addEventListener('click', () => {
    api.logout();
    currentView = 'login';
    render();
  });

  document.querySelector('#btn-show-logs')?.addEventListener('click', () => {
    currentView = 'logs';
    render();
  });

  document.querySelector('#btn-add-task')?.addEventListener('click', () => showTaskModal());

  try {
    subscriptions = await api.subs.list();
    const list = document.querySelector('#task-list')!;
    if (subscriptions.length === 0) {
      list.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-muted)">No subscriptions yet. Create your first one!</div>`;
    } else {
      list.innerHTML = subscriptions.map(sub => `
        <div class="glass-card task-card">
          <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; align-items: center;">
             <div style="display: flex; align-items: center;">
               <div class="platform-logo" style="background: ${getPlatformColor(sub.platform)}20">
                 ${getPlatformLogo(sub.platform)}
               </div>
               <h3 style="margin: 0">${sub.name}</h3>
             </div>
             <span class="task-status ${sub.isActive ? 'status-active' : 'status-inactive'}"></span>
          </div>
          <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${sub.url}
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="secondary btn-edit" data-id="${sub.id}">Edit</button>
            <button class="secondary btn-test" data-id="${sub.id}">Test Now</button>
          </div>
        </div>
      `).join('');

      document.querySelectorAll('.btn-edit').forEach(b => {
        b.addEventListener('click', (e) => {
          const id = (e.target as HTMLElement).dataset.id!;
          const sub = subscriptions.find(s => s.id === id);
          showTaskModal(sub);
        });
      });

      document.querySelectorAll('.btn-test').forEach(b => {
        b.addEventListener('click', async (e) => {
          const id = (e.target as HTMLElement).dataset.id!;
          const btn = (e.target as HTMLButtonElement);
          btn.innerText = 'Testing...';
          btn.disabled = true;
          try {
            const res = await api.subs.test(id);
            alert(res.status === 'success' ? 'Push Success!' : 'Push Failed: ' + res.error);
          } catch (e: any) { alert(e.message); }
          btn.innerText = 'Test Now';
          btn.disabled = false;
        });
      });
    }
  } catch (e: any) { alert(e.message); }
}

async function renderLogs() {
  app.innerHTML = `
    <div class="nav">
      <h1 class="title" style="margin: 0;">Push Logs</h1>
      <button id="btn-back-dash" class="secondary" style="width: auto;">Back to Dashboard</button>
    </div>
    <div class="glass-card">
      <div id="log-list">Loading...</div>
    </div>
  `;

  document.querySelector('#btn-back-dash')?.addEventListener('click', () => {
    currentView = 'dashboard';
    render();
  });

  try {
    logs = await api.logs.list();
    const list = document.querySelector('#log-list')!;
    if (logs.length === 0) {
      list.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted)">No logs found.</div>`;
    } else {
      list.innerHTML = logs.map(log => `
        <div class="log-item">
          <div class="log-header">
            <span>${log.taskName}</span>
            <span>${new Date(log.timestamp).toLocaleString()}</span>
          </div>
          <div style="color: ${log.status === 'success' ? '#10b981' : '#ef4444'}; margin-bottom: 0.5rem; font-weight: 600;">
            ${log.status.toUpperCase()} ${log.error ? `- ${log.error}` : ''}
          </div>
          <div style="font-size: 0.875rem; background: rgba(0,0,0,0.3); padding: 0.75rem; border-radius: 0.5rem; max-height: 100px; overflow-y: auto;">
            ${log.content.replace(/\n/g, '<br>')}
          </div>
        </div>
      `).join('');
    }
  } catch (e: any) { alert(e.message); }
}

function showTaskModal(sub?: any) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="glass-card modal-content">
      <h2 style="margin-bottom: 1.5rem;">${sub ? 'Edit Task' : 'New Subscription Task'}</h2>
      
      <div class="modal-body">
        <!-- Left: Configuration -->
        <div class="modal-config">
          <div class="form-group">
            <label>Task Name</label>
            <input type="text" id="m-name" value="${sub ? sub.name : ''}" placeholder="Daily AI News">
          </div>
          <div class="form-group">
            <label>Target URL (Support {{date}}, {{year}}, {{month}}, {{day}})</label>
            <input type="text" id="m-url" list="url-suggestions" value="${sub ? sub.url : ''}" placeholder="https://example.com/news/{{date}}">
            <datalist id="url-suggestions">
              <option value="https://newsnow.busiyi.world">各类国内新闻</option>
              <option value="https://ai.hubtoday.app/{{year}}-{{month}}/{{year}}-{{month}}-{{day}}/">AI科技新闻</option>
            </datalist>
          </div>
          <div class="form-group">
            <label>Cron Expression (Schedule)</label>
            <input type="text" id="m-cron" value="${sub ? sub.cron : '0 9 * * *'}" placeholder="0 9 * * *">
          </div>
          <div class="form-group">
            <label>Platform</label>
            <select id="m-platform">
              <option value="dingtalk" ${sub?.platform === 'dingtalk' ? 'selected' : ''}>DingTalk</option>
              <option value="wechat" ${sub?.platform === 'wechat' ? 'selected' : ''}>WeChat Work</option>
              <option value="feishu" ${sub?.platform === 'feishu' ? 'selected' : ''}>Feishu</option>
              <option value="telegram" ${sub?.platform === 'telegram' ? 'selected' : ''}>Telegram</option>
            </select>
          </div>
          <div class="form-group">
            <label>Webhook URL</label>
            <input type="text" id="m-webhook" value="${sub ? sub.webhook : ''}" placeholder="https://oapi.dingtalk.com/robot/send?access_token=...">
          </div>
          <div class="form-group">
            <label>Content Template (Prompt for AI)</label>
            <textarea id="m-template" rows="10" placeholder="Summarize the top 3 items with bullet points...">${sub ? sub.template : 'Summarize the main news into 3 items with clear bullet points. Use Chinese.'}</textarea>
          </div>
        </div>

        <!-- Right: Preview -->
        <div class="modal-preview">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="margin: 0;">Debug Result (AI Prompt Output)</label>
            <button id="btn-preview-task" class="secondary" style="width: auto; padding: 0.4rem 1rem; font-size: 0.875rem;">Run Debug</button>
          </div>
          <div class="preview-result" id="preview-area">
            <div class="preview-placeholder">
              <div style="font-size: 2rem; margin-bottom: 1rem;">🔍</div>
              <div>Fill in the URL and Template, then click "Run Debug" to see the AI result.</div>
            </div>
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 1rem; margin-top: 2rem; border-top: 1px solid var(--glass-border); padding-top: 1.5rem;">
        <button id="btn-save-task">Save Task</button>
        <button id="btn-close-modal" class="secondary">Cancel</button>
        ${sub ? `<button id="btn-delete-task" style="background: #ef4444; width: auto; margin-left: auto;">Delete</button>` : ''}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.querySelector('#btn-close-modal')?.addEventListener('click', () => modal.remove());

  document.querySelector('#btn-preview-task')?.addEventListener('click', async () => {
    const area = document.querySelector('#preview-area') as HTMLElement;
    const btn = document.querySelector('#btn-preview-task') as HTMLButtonElement;

    const data = {
      url: (document.querySelector('#m-url') as HTMLInputElement).value,
      template: (document.querySelector('#m-template') as HTMLTextAreaElement).value,
      webhook: (document.querySelector('#m-webhook') as HTMLInputElement).value,
      platform: (document.querySelector('#m-platform') as HTMLSelectElement).value,
    };

    if (!data.url) return alert('Please enter target URL');

    area.innerHTML = `<div class="preview-loading"><div class="spinner"></div><div style="margin-left: 1rem;">Analyzing content...</div></div>`;
    btn.disabled = true;

    try {
      const res = await api.subs.preview(data);
      if (res.status === 'success') {
        let html = `<div style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--glass-border);">${res.content}</div>`;

        if (res.webhookStatus === 'success') {
          html += `<div style="background: rgba(16, 185, 129, 0.1); padding: 0.75rem; border-radius: 0.5rem; font-size: 0.875rem;">
            <div style="color: #10b981; font-weight: 600; margin-bottom: 0.25rem;">✓ Webhook Push Success</div>
            <code style="color: var(--text-muted);">${res.webhookResponse}</code>
          </div>`;
        } else if (res.webhookStatus === 'failure') {
          html += `<div style="background: rgba(239, 68, 68, 0.1); padding: 0.75rem; border-radius: 0.5rem; font-size: 0.875rem;">
            <div style="color: #ef4444; font-weight: 600; margin-bottom: 0.25rem;">✗ Webhook Push Failed</div>
            <div style="color: var(--text-muted);">${res.webhookError}</div>
          </div>`;
        } else {
          html += `<div style="color: var(--text-muted); font-size: 0.875rem; font-style: italic;">Webhook not configured, push skipped.</div>`;
        }

        area.innerHTML = html;
      } else {
        area.innerHTML = `<div style="color: #ef4444; padding: 1rem;">Error: ${res.error}</div>`;
      }
    } catch (e: any) {
      area.innerHTML = `<div style="color: #ef4444; padding: 1rem;">Error: ${e.message}</div>`;
    } finally {
      btn.disabled = false;
    }
  });

  document.querySelector('#btn-save-task')?.addEventListener('click', async () => {
    const data = {
      name: (document.querySelector('#m-name') as HTMLInputElement).value,
      url: (document.querySelector('#m-url') as HTMLInputElement).value,
      cron: (document.querySelector('#m-cron') as HTMLInputElement).value,
      platform: (document.querySelector('#m-platform') as HTMLSelectElement).value,
      webhook: (document.querySelector('#m-webhook') as HTMLInputElement).value,
      template: (document.querySelector('#m-template') as HTMLTextAreaElement).value,
      isActive: true
    };

    try {
      if (sub) {
        await api.subs.update(sub.id, data);
      } else {
        await api.subs.create(data);
      }
      modal.remove();
      renderDashboard();
    } catch (e: any) { alert(e.message); }
  });

  if (sub) {
    document.querySelector('#btn-delete-task')?.addEventListener('click', async () => {
      if (!confirm('Delete this task?')) return;
      try {
        await api.subs.delete(sub.id);
        modal.remove();
        renderDashboard();
      } catch (e: any) { alert(e.message); }
    });
  }
}

// Start
render();

function getPlatformColor(platform: string) {
  switch (platform) {
    case 'dingtalk': return '#0089FF';
    case 'wechat': return '#4C84FC';
    case 'feishu': return '#00D6B9';
    case 'telegram': return '#24A1DE';
    default: return '#999999';
  }
}

function getPlatformLogo(platform: string) {
  switch (platform) {
    case 'dingtalk':
      return `<img src="/dingtalk.svg" alt="DingTalk" />`;
    case 'wechat':
      return `<img src="/weixinwork.svg" alt="WeChat" />`;
    case 'feishu':
      return `<img src="/fieshu.svg" alt="Feishu" />`;
    case 'telegram':
      return `<img src="/telegram.svg" alt="Telegram" />`;
    default:
      return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>`;
  }
}

