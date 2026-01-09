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
    <form id="login-form">
      <div id="auth-form">
        <div class="form-group">
          <label>邮箱</label>
          <input type="email" id="email" placeholder="your@email.com">
        </div>
        <div class="form-group">
          <label>密码</label>
          <input type="password" id="password" placeholder="••••••••">
        </div>
        <button type="submit" id="btn-login">登录</button>
        <button type="button" id="btn-show-reg" class="secondary" style="margin-top: 1rem;">创建账号</button>
      </div>
    </form>
  </div>
  `;

  document.querySelector('#login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
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
  app.innerHTML = `
    <div class="auth-container glass-card">
      <h1 class="title">SubNews</h1>
      <form id="register-form">
        <div id="auth-form">
          <div class="form-group">
            <label>邮箱</label>
            <input type="email" id="email" placeholder="your@email.com">
          </div>
          <div class="form-group">
            <label>密码</label>
            <input type="password" id="password" placeholder="••••••••">
          </div>
          <button type="submit" id="btn-register">注册</button>
          <button type="button" id="btn-show-login" class="secondary" style="margin-top: 1rem;">返回登录</button>
        </div>
      </form>
    </div>
  `;

  document.querySelector('#register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (document.querySelector('#email') as HTMLInputElement).value;
    const password = (document.querySelector('#password') as HTMLInputElement).value;
    try {
      await api.auth.register({ email, password });
      alert('注册成功！请登录。');
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
      <div class="nav-actions">
        <button id="btn-manual" class="secondary" style="width: auto; margin-right: 1rem;">手册</button>
        <button id="btn-show-logs" class="secondary" style="width: auto; margin-right: 1rem;">日志</button>
        <button id="btn-logout" class="secondary" style="width: auto;">退出</button>
      </div>
    </div>
    
    <div class="dashboard-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
      <h2>我的订阅</h2>
      <button id="btn-add-task" style="width: auto;">+ 新建任务</button>
    </div>

    <div class="task-grid" id="task-list">
      <div style="color: var(--text-muted)">加载中...</div>
    </div>
  `;

  document.querySelector('#btn-manual')?.addEventListener('click', () => {
    window.open('https://siazucxty8.feishu.cn/docx/IVWTd5FiaoxVEAxfMy2cRdXnnEc', '_blank');
  });

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
      list.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-muted)">暂无订阅任务，快创建一个吧！</div>`;
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
            <button class="secondary btn-edit" data-id="${sub.id}">编辑</button>
            <button class="secondary btn-test" data-id="${sub.id}">立即测试</button>
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
          btn.innerText = '测试中...';
          btn.disabled = true;
          try {
            const res = await api.subs.test(id);
            // console.log('Test result:', res);
            alert(res.status === 'success' ? '推送成功！' : '推送失败: ' + res.error);
          } catch (e: any) {
            console.error(e);
            alert('测试失败: ' + e.message);
          }
          btn.innerText = '立即测试';
          btn.disabled = false;
        });
      });
    }
  } catch (e: any) { alert(e.message); }
}

async function renderLogs() {
  app.innerHTML = `
    <div class="nav">
      <h1 class="title" style="margin: 0;">推送日志</h1>
      <button id="btn-back-dash" class="secondary" style="width: auto;">返回仪表盘</button>
    </div>
    <div class="glass-card">
      <div id="log-list">加载中...</div>
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
      list.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted)">暂无日志记录。</div>`;
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
      <h2 style="margin-bottom: 1.5rem;">${sub ? '编辑任务' : '新建订阅任务'}</h2>
      
      <div class="modal-body">
        <!-- Left: Configuration -->
        <div class="modal-config">
          <div class="form-group">
            <label>任务名称</label>
            <input type="text" id="m-name" value="${sub ? sub.name : ''}" placeholder="例如：每日 AI 新闻">
          </div>
          <div class="form-group">
            <label>目标 URL (支持变量 {{date}}, {{year}}, {{month}}, {{day}})</label>
            <input type="text" id="m-url" list="url-suggestions" value="${sub ? sub.url : ''}" placeholder="https://example.com/news/{{date}}">
            <datalist id="url-suggestions">
              <option value="https://newsnow.busiyi.world">各类国内新闻</option>
              <option value="https://ai.hubtoday.app/{{year}}-{{month}}/{{year}}-{{month}}-{{day}}/">AI科技新闻</option>
            </datalist>
          </div>
          <div class="form-group">
            <label>调度类型</label>
            <select id="m-schedule-type">
              <option value="daily" ${(!sub || sub.scheduleType === 'daily') ? 'selected' : ''}>每天 (Daily)</option>
              <option value="once" ${sub && sub.scheduleType === 'once' ? 'selected' : ''}>单次 (One-time)</option>
            </select>
          </div>
          <div class="form-group">
            <label>调度时间</label>
            <!-- Daily: Time Picker, Once: Datetime Picker -->
            <input type="time" id="m-schedule-time-daily" value="${(sub && sub.scheduleType === 'daily') ? sub.scheduleTime : '09:00'}" style="display: ${(sub && sub.scheduleType === 'once') ? 'none' : 'block'};">
            <input type="datetime-local" id="m-schedule-time-once" value="${(sub && sub.scheduleType === 'once') ? sub.scheduleTime : ''}" style="display: ${(sub && sub.scheduleType === 'once') ? 'block' : 'none'};">
            <small style="color: var(--text-muted); font-size: 0.75rem;">注意：时间为北京时间 (UTC+8)</small>
          </div>
          <div class="form-group">
            <label>推送平台</label>
            <select id="m-platform">
              <option value="dingtalk" ${sub?.platform === 'dingtalk' ? 'selected' : ''}>钉钉 (DingTalk)</option>
              <option value="wechat" ${sub?.platform === 'wechat' ? 'selected' : ''}>企业微信 (WeChat Work)</option>
              <option value="feishu" ${sub?.platform === 'feishu' ? 'selected' : ''}>飞书 (Feishu)</option>
              <option value="telegram" ${sub?.platform === 'telegram' ? 'selected' : ''}>Telegram</option>
            </select>
          </div>
          <div class="form-group">
            <label>Webhook URL</label>
            <input type="text" id="m-webhook" value="${sub ? sub.webhook : ''}" placeholder="https://oapi.dingtalk.com/robot/send?access_token=...">
          </div>
          <div class="form-group">
            <label>内容模板 (AI 提示词)</label>
            <textarea id="m-template" rows="10" placeholder="例如：总结前3条重要新闻...">${sub ? sub.template : '请总结最重要的3条新闻，列出要点。'}</textarea>
          </div>
        </div>

        <!-- Right: Preview -->
        <div class="modal-preview">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="margin: 0;">调试结果 (AI 输出预览)</label>
            <button id="btn-preview-task" class="secondary" style="width: auto; padding: 0.4rem 1rem; font-size: 0.875rem;">运行调试</button>
          </div>
          <div class="preview-result" id="preview-area">
            <div class="preview-placeholder">
              <div style="font-size: 2rem; margin-bottom: 1rem;">🔍</div>
              <div>填写 URL 和模板后，点击“运行调试”查看 AI 处理结果。</div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <div>
          ${sub ? `<button id="btn-delete-task" style="background: transparent; border: 1px solid #ef4444; color: #ef4444; width: auto;">删除任务</button>` : ''}
        </div>
        <div class="modal-footer-right">
          <button id="btn-close-modal" class="secondary">取消</button>
          <button id="btn-save-task">保存任务</button>
        </div>
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

    if (!data.url) return alert('请输入目标 URL');

    area.innerHTML = `<div class="preview-loading"><div class="spinner"></div><div style="margin-left: 1rem;">正在分析内容...</div></div>`;
    btn.disabled = true;

    try {
      const res = await api.subs.preview(data);
      if (res.status === 'success') {
        let html = `<div style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--glass-border);">${res.content}</div>`;

        if (res.webhookStatus === 'success') {
          html += `<div style="background: rgba(16, 185, 129, 0.1); padding: 0.75rem; border-radius: 0.5rem; font-size: 0.875rem;">
            <div style="color: #10b981; font-weight: 600; margin-bottom: 0.25rem;">✓ Webhook 推送成功</div>
            <code style="color: var(--text-muted);">${res.webhookResponse}</code>
          </div>`;
        } else if (res.webhookStatus === 'failure') {
          html += `<div style="background: rgba(239, 68, 68, 0.1); padding: 0.75rem; border-radius: 0.5rem; font-size: 0.875rem;">
            <div style="color: #ef4444; font-weight: 600; margin-bottom: 0.25rem;">✗ Webhook 推送失败</div>
            <div style="color: var(--text-muted);">${res.webhookError}</div>
          </div>`;
        } else {
          html += `<div style="color: var(--text-muted); font-size: 0.875rem; font-style: italic;">未配置 Webhook，跳过推送。</div>`;
        }

        area.innerHTML = html;
      } else {
        area.innerHTML = `<div style="color: #ef4444; padding: 1rem;">错误: ${res.error}</div>`;
      }
    } catch (e: any) {
      area.innerHTML = `<div style="color: #ef4444; padding: 1rem;">错误: ${e.message}</div>`;
    } finally {
      btn.disabled = false;
    }
  });


  const typeSelect = document.querySelector('#m-schedule-type') as HTMLSelectElement;
  const dailyInput = document.querySelector('#m-schedule-time-daily') as HTMLInputElement;
  const onceInput = document.querySelector('#m-schedule-time-once') as HTMLInputElement;

  typeSelect.addEventListener('change', () => {
    if (typeSelect.value === 'daily') {
      dailyInput.style.display = 'block';
      onceInput.style.display = 'none';
      dailyInput.focus();
    } else {
      dailyInput.style.display = 'none';
      onceInput.style.display = 'block';
      onceInput.focus();
    }
  });

  document.querySelector('#btn-save-task')?.addEventListener('click', async () => {
    const sType = typeSelect.value;
    const sTime = sType === 'daily' ? dailyInput.value : onceInput.value;

    if (!sTime) return alert('请选择调度时间');

    const data = {
      name: (document.querySelector('#m-name') as HTMLInputElement).value,
      url: (document.querySelector('#m-url') as HTMLInputElement).value,
      scheduleType: sType,
      scheduleTime: sTime,
      platform: (document.querySelector('#m-platform') as HTMLSelectElement).value,
      webhook: (document.querySelector('#m-webhook') as HTMLInputElement).value,
      template: (document.querySelector('#m-template') as HTMLTextAreaElement).value,
      isActive: true
    };

    try {
      if (sub) {
        console.log('Updating task:', sub.id, data);
        await api.subs.update(sub.id, data);
      } else {
        console.log('Creating new task:', data);
        await api.subs.create(data);
      }
      console.log('Task saved successfully');
      modal.remove();
      renderDashboard();
    } catch (e: any) {
      console.error('Save error:', e);
      alert(e.message);
    }
  });

  if (sub) {
    document.querySelector('#btn-delete-task')?.addEventListener('click', async () => {
      if (!confirm('确定要删除这个任务吗？')) return;
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

