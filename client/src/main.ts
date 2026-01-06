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
      <div class="form-group">
        <label>Task Name</label>
        <input type="text" id="m-name" value="${sub ? sub.name : ''}" placeholder="Daily AI News">
      </div>
      <div class="form-group">
        <label>Target URL (Support {{date}} for dynamic URL)</label>
        <input type="text" id="m-url" value="${sub ? sub.url : ''}" placeholder="https://example.com/news/{{date}}">
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
        <textarea id="m-template" rows="4" placeholder="Summarize the top 3 items with bullet points...">${sub ? sub.template : 'Summarize the main news into 3 items with clear bullet points. Use Chinese.'}</textarea>
      </div>
      <div style="display: flex; gap: 1rem; margin-top: 2rem;">
        <button id="btn-save-task">Save Task</button>
        <button id="btn-close-modal" class="secondary">Cancel</button>
        ${sub ? `<button id="btn-delete-task" style="background: #ef4444; width: auto;">Delete</button>` : ''}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.querySelector('#btn-close-modal')?.addEventListener('click', () => modal.remove());

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
  const color = getPlatformColor(platform);
  switch (platform) {
    case 'dingtalk':
      // Wing / Lightning shape
      return `<svg viewBox="0 0 1024 1024" fill="${color}"><path d="M512 0C229.23 0 0 229.23 0 512s229.23 512 512 512 512-229.23 512-512S794.77 0 512 0zm0 938.67C276.36 938.67 85.33 747.64 85.33 512S276.36 85.33 512 85.33 938.67 276.36 938.67 512 747.64 938.67 512 938.67z"/><path d="M725.33 384H554.67l42.67-170.67-256 298.67h170.67l-42.67 170.67z"/></svg>`;
    case 'wechat':
      // Chat Bubbles (Enterprise WeChat usually blue)
      return `<svg viewBox="0 0 16 16" fill="${color}"><path d="M11.176 14.429c-2.665 0-4.826-1.8-4.826-4.018 0-2.22 2.159-4.02 4.824-4.02S16 8.191 16 10.411c0 1.21-.65 2.301-1.666 3.036a.32.32 0 0 0-.12.366l.218.81a.6.6 0 0 1 .029.117.166.166 0 0 1-.162.162.2.2 0 0 1-.092-.03l-1.057-.61a.5.5 0 0 0-.256-.074.5.5 0 0 0-.142.021 5.7 5.7 0 0 1-1.576.22M9.064 9.542a.647.647 0 1 0 .557-1 .645.645 0 0 0-.646.647.6.6 0 0 0 .09.353Zm3.232.001a.646.646 0 1 0 .546-1 .645.645 0 0 0-.644.644.63.63 0 0 0 .098.356"/><path d="M0 6.826c0 1.455.781 2.765 2.001 3.656a.385.385 0 0 1 .143.439l-.161.6-.1.373a.5.5 0 0 0-.032.14.19.19 0 0 0 .193.193q.06 0 .111-.029l1.268-.733a.6.6 0 0 1 .308-.088q.088 0 .171.025a6.8 6.8 0 0 0 1.625.26 4.5 4.5 0 0 1-.177-1.251c0-2.936 2.785-5.02 5.824-5.02l.15.002C10.587 3.429 8.392 2 5.796 2 2.596 2 0 4.16 0 6.826m4.632-1.555a.77.77 0 1 1-1.54 0 .77.77 0 0 1 1.54 0m3.875 0a.77.77 0 1 1-1.54 0 .77.77 0 0 1 1.54 0"/></svg>`;
    case 'feishu':
      // Simplified Bird/Triangle
      return `<svg viewBox="0 0 24 24" fill="${color}"><path d="M21.9 11.2l-9.8-9.8c-.4-.4-1-.4-1.4 0l-9.8 9.8c-.4.4-.4 1 0 1.4l9.8 9.8c.4.4 1 .4 1.4 0l9.8-9.8c.4-.4.4-1 0-1.4zM12 20.6L3.4 12 12 3.4 20.6 12 12 20.6z"/><path d="M12 7l-5 5h10l-5-5z"/></svg>`;
    case 'telegram':
      // Paper Plane
      return `<svg viewBox="0 0 16 16" fill="${color}"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8.287 5.906q-1.168.486-4.666 2.01-.567.225-.595.442c-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.294q.39.01.868-.32 3.269-2.206 3.374-2.23c.05-.012.12-.026.166.016s.042.12.037.141c-.03.129-1.227 1.241-1.846 1.817-.193.18-.33.307-.358.336a8 8 0 0 1-.188.186c-.38.366-.664.64.015 1.088.327.216.589.393.85.571.284.194.568.387.936.629q.14.092.27.187c.331.236.63.448.997.414.214-.02.435-.22.547-.82.265-1.417.786-4.486.906-5.751a1.4 1.4 0 0 0-.013-.315.34.34 0 0 0-.114-.217.53.53 0 0 0-.31-.093c-.3.005-.763.166-2.984 1.09"/></svg>`;
    default:
      // Generic Bell
      return `<svg viewBox="0 0 24 24" fill="${color}"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>`;
  }
}

