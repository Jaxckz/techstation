import { Dexie, type Table } from 'dexie';
import { LogEntry, LogImage, AppSettings, TodoEntry, SecurityLogEntry, DeviceEntry, UserAccount, RolePermission, KnowledgeEntry, AuditLogEntry, ReportTask, ReportSegment } from './types';

export const db = new Dexie('LocalLogDB') as Dexie & {
  logs: Table<LogEntry>;
  securityLogs: Table<SecurityLogEntry>;
  images: Table<LogImage>;
  settings: Table<any>; 
  todos: Table<TodoEntry>;
  devices: Table<DeviceEntry>;
  users: Table<UserAccount>;
  rolePermissions: Table<RolePermission>;
  knowledge: Table<KnowledgeEntry>;
  auditLogs: Table<AuditLogEntry>;
  reportTasks: Table<ReportTask>;
  reportSegments: Table<ReportSegment>;
};

// 升级版本至 24 强制重置索引与初始权限
db.version(24).stores({
  logs: '++id, title, category, officeArea, date, createdAt, author',
  securityLogs: '++id, eventType, severity, sourceIp, targetIp, officeArea, status, timestamp, author',
  images: 'id, name, label',
  settings: 'id', 
  todos: '++id, title, status, priority, officeArea, createdAt, author',
  devices: '++id, name, sn, assetId, type, officeArea, status, manager, updatedAt',
  users: '++id, username, role',
  rolePermissions: 'role',
  knowledge: '++id, title, category, author, updatedAt',
  auditLogs: '++id, username, action, ip, timestamp',
  reportTasks: '++id, month, title, status, createdAt',
  reportSegments: '++id, taskId, author, segmentName, updatedAt'
});

const populateDefaults = async () => {
  try {
    const userCount = await db.users.count();
    if (userCount === 0) {
      await db.users.add({
        username: 'admin',
        password: 'admin888',
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // 重新填充权限表，确保 settings 对所有角色可见
    await db.rolePermissions.clear();
    await db.rolePermissions.bulkAdd([
      { role: 'ADMIN', allowedTabs: ['dashboard', 'tasks', 'reports', 'security', 'devices', 'timeline', 'knowledge', 'add', 'stats', 'search', 'settings'] },
      { role: 'ENGINEER', allowedTabs: ['dashboard', 'tasks', 'reports', 'devices', 'timeline', 'knowledge', 'add', 'search', 'settings'] },
      { role: 'SECURITY', allowedTabs: ['dashboard', 'security', 'timeline', 'search', 'settings'] }
    ]);
    console.log("DB Defaults (v24) populated.");
  } catch (e) {
    console.error("DB Populate Error:", e);
  }
};

db.on('populate', populateDefaults);

export const initDB = async () => {
  if (!db.isOpen()) {
    await db.open();
  }
  const permCount = await db.rolePermissions.count();
  if (permCount === 0) {
    await populateDefaults();
  }
};