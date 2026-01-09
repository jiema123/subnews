export interface User {
  email: string;
  passwordHash: string;
}

export interface Subscription {
  id: string;
  userId: string;
  name: string;
  url: string;
  scheduleType: 'daily' | 'once';
  scheduleTime: string; // "HH:mm" for daily, "YYYY-MM-DDTHH:mm" for once
  webhook: string;
  platform: 'dingtalk' | 'wechat' | 'feishu' | 'telegram';
  template: string;
  isActive: boolean;
  lastRun?: number;
  nextRun?: number;
}

export interface PushLog {
  id: string;
  userId: string;
  taskId: string;
  taskName: string;
  content: string;
  status: 'success' | 'failure' | 'skipped';
  error?: string;
  timestamp: number;
}
