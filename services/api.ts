
const API_BASE = '/api';

// Simple in-memory context (role, username) for client-side usage if needed
let context = { role: '', username: '' };

export const api = {
  setContext: (role: string, username: string) => {
    context = { role, username };
  },

  // Auth
  login: async (username: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return res.json();
  },
  validateUser: async (username: string) => {
    const res = await fetch(`${API_BASE}/auth/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    return res.json();
  },

  // Users (Admin)
  getUsers: async () => {
    const res = await fetch(`${API_BASE}/users`);
    return res.json();
  },
  createUser: async (user: any) => {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...user, operator: context.username })
    });
    return res.json();
  },
  batchImportUsers: async (users: any[]) => {
    const res = await fetch(`${API_BASE}/users/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users, operator: context.username })
    });
    return res.json();
  },
  updateUser: async (id: number, data: any) => {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, operator: context.username })
    });
    return res.json();
  },
  deleteUser: async (id: number) => {
    const res = await fetch(`${API_BASE}/users/${id}?operator=${context.username}`, { method: 'DELETE' });
    return res.json();
  },
  // Export My Data
  exportMyData: async (username: string) => {
    const res = await fetch(`${API_BASE}/profile/export?username=${encodeURIComponent(username)}`);
    return res.json();
  },

  // Role Permissions
  getPermissions: async () => {
    const res = await fetch(`${API_BASE}/permissions`);
    return res.json();
  },
  updatePermission: async (role: string, allowedTabs: string[]) => {
    const res = await fetch(`${API_BASE}/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, allowedTabs, operator: context.username })
    });
    return res.json();
  },

  // Settings
  getUploadPath: async () => {
    const res = await fetch(`${API_BASE}/settings/upload-path`);
    return res.json();
  },
  setUploadPath: async (path: string) => {
    const res = await fetch(`${API_BASE}/settings/upload-path`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });
    return res.json();
  },
  resetUploadPath: async () => {
    const res = await fetch(`${API_BASE}/settings/upload-path`, { method: 'DELETE' });
    return res.json();
  },

  // App Config (systemName, officeAreas, categories, deviceTypes)
  getAppConfig: async () => {
    const res = await fetch(`${API_BASE}/settings/app-config`);
    return res.json();
  },
  setAppConfig: async (config: any) => {
    const res = await fetch(`${API_BASE}/settings/app-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, operator: context.username })
    });
    return res.json();
  },

  // AI Config
  getAIConfig: async () => {
    const res = await fetch(`${API_BASE}/settings/ai`);
    return res.json();
  },
  setAIConfig: async (config: any) => {
    const res = await fetch(`${API_BASE}/settings/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, operator: context.username })
    });
    return res.json();
  },

  // Announcements
  getAnnouncements: async (activeOnly?: boolean) => {
    const res = await fetch(`${API_BASE}/announcements${activeOnly ? '?activeOnly=true' : ''}`);
    return res.json();
  },
  createAnnouncement: async (data: any) => {
    const res = await fetch(`${API_BASE}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, author: context.username })
    });
    return res.json();
  },
  deleteAnnouncement: async (id: number) => {
    const res = await fetch(`${API_BASE}/announcements/${id}?operator=${context.username}`, { method: 'DELETE' });
    return res.json();
  },
  updateAnnouncementStatus: async (id: number, isActive: boolean) => {
    const res = await fetch(`${API_BASE}/announcements/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive })
    });
    return res.json();
  },

  // Audit
  getAuditLogs: async () => {
    const res = await fetch(`${API_BASE}/audit`);
    return res.json();
  },

  // Logs
  getLogs: async (page?: number, limit?: number) => {
    let url = `${API_BASE}/logs`;
    if (page && limit) {
      url += `?page=${page}&limit=${limit}`;
    }
    const res = await fetch(url);
    return res.json();
  },
  createLog: async (formData: FormData) => {
    const author = formData.get('author') as string;
    const res = await fetch(`${API_BASE}/logs?module=log&username=${encodeURIComponent(author || 'anonymous')}`, { method: 'POST', body: formData });
    return res.json();
  },
  deleteLog: async (id: number) => {
    const res = await fetch(`${API_BASE}/logs/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Todos
  getTodos: async () => {
    const res = await fetch(`${API_BASE}/todos`);
    return res.json();
  },
  createTodo: async (formData: FormData) => {
    // Note: switched to FormData for attachments
    const author = formData.get('author') as string || context.username;
    const res = await fetch(`${API_BASE}/todos?module=todo&username=${encodeURIComponent(author || 'anonymous')}`, {
      method: 'POST',
      body: formData
    });
    return res.json();
  },
  updateTodoStatus: async (id: number, status: string, completedAt: Date | null, handler?: string) => {
    const res = await fetch(`${API_BASE}/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, completedAt, handler })
    });
    return res.json();
  },
  deleteTodo: async (id: number) => {
    const res = await fetch(`${API_BASE}/todos/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Devices
  getDevices: async () => {
    const res = await fetch(`${API_BASE}/devices`);
    return res.json();
  },
  createDevice: async (formData: FormData) => {
    const author = formData.get('author') as string || context.username;
    const res = await fetch(`${API_BASE}/devices?module=device&username=${encodeURIComponent(author || 'anonymous')}`, {
      method: 'POST',
      body: formData
    });
    return res.json();
  },
  updateDevice: async (id: number, formData: FormData) => {
    const author = formData.get('author') as string || context.username;
    const res = await fetch(`${API_BASE}/devices/${id}?module=device&username=${encodeURIComponent(author || 'anonymous')}`, {
      method: 'PUT',
      body: formData
    });
    return res.json();
  },
  deleteDevice: async (id: number) => {
    const res = await fetch(`${API_BASE}/devices/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Security Logs
  getSecurityLogs: async () => {
    const res = await fetch(`${API_BASE}/security`);
    return res.json();
  },
  createSecurityLog: async (formData: FormData) => {
    const author = formData.get('author') as string;
    const res = await fetch(`${API_BASE}/security?module=security&username=${encodeURIComponent(author || 'anonymous')}`, { method: 'POST', body: formData });
    return res.json();
  },
  deleteSecurityLog: async (id: number) => {
    const res = await fetch(`${API_BASE}/security/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Knowledge Base
  getKnowledge: async () => {
    const res = await fetch(`${API_BASE}/knowledge`);
    return res.json();
  },
  createKnowledge: async (formData: FormData) => {
    const author = formData.get('author') as string;
    const res = await fetch(`${API_BASE}/knowledge?module=knowledge&username=${encodeURIComponent(author || 'anonymous')}`, { method: 'POST', body: formData });
    return res.json();
  },
  updateKnowledge: async (id: number, data: any) => {
    // Note: updateKnowledge still uses JSON in this implementation unless refactored completely
    const res = await fetch(`${API_BASE}/knowledge/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  deleteKnowledge: async (id: number) => {
    const res = await fetch(`${API_BASE}/knowledge/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Reports
  getReportTasks: async () => {
    const res = await fetch(`${API_BASE}/reports/tasks`);
    return res.json();
  },
  createReportTask: async (task: any) => {
    const res = await fetch(`${API_BASE}/reports/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    return res.json();
  },
  deleteReportTask: async (id: number) => {
    const res = await fetch(`${API_BASE}/reports/tasks/${id}`, { method: 'DELETE' });
    return res.json();
  },
  getReportSegments: async (taskId: number) => {
    const res = await fetch(`${API_BASE}/reports/segments?taskId=${taskId}`);
    return res.json();
  },
  createReportSegment: async (segment: any) => {
    const res = await fetch(`${API_BASE}/reports/segments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(segment)
    });
    return res.json();
  },
  deleteReportSegment: async (id: number) => {
    const res = await fetch(`${API_BASE}/reports/segments/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // OA Events
  getOAEvents: async () => {
    const res = await fetch(`${API_BASE}/oa-events`);
    return res.json();
  },
  createOAEvent: async (formData: FormData) => {
    const author = formData.get('author') as string || context.username;
    const res = await fetch(`${API_BASE}/oa-events?module=oa&username=${encodeURIComponent(author || 'anonymous')}`, {
      method: 'POST',
      body: formData
    });
    return res.json();
  },
  updateOAEvent: async (id: number, data: any) => {
    // If data is FormData (has entries), use POST-like body but PUT method
    if (data instanceof FormData) {
      const author = data.get('author') as string || context.username;
      const res = await fetch(`${API_BASE}/oa-events/${id}?module=oa&username=${encodeURIComponent(author || 'anonymous')}`, {
        method: 'PUT',
        body: data
      });
      return res.json();
    } else {
      // Fallback for status updates which send JSON
      const res = await fetch(`${API_BASE}/oa-events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    }
  },
  deleteOAEvent: async (id: number) => {
    const res = await fetch(`${API_BASE}/oa-events/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Shared Files
  getSharedFiles: async () => {
    const res = await fetch(`${API_BASE}/shared-files`);
    return res.json();
  },
  createSharedFile: async (formData: FormData) => {
    const author = formData.get('author') as string;
    const res = await fetch(`${API_BASE}/shared-files?module=share&username=${encodeURIComponent(author || 'anonymous')}`, { method: 'POST', body: formData });
    return res.json();
  },
  deleteSharedFile: async (id: number) => {
    const res = await fetch(`${API_BASE}/shared-files/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Admin
  downloadBackup: () => {
    window.location.href = `${API_BASE}/admin/backup`;
  },
  restoreBackup: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/admin/restore`, {
      method: 'POST',
      body: formData
    });
    return res.json();
  }
};
