
import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5634;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // 增加限制以支持批量导入

let db;
let customUploadPath = ''; 

// 辅助函数：记录审计日志
const logAudit = async (username, action, details, req) => {
    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        await db.run(
            'INSERT INTO audit_logs (username, action, details, ip, timestamp) VALUES (?, ?, ?, ?, ?)',
            [username || 'SYSTEM', action, details, ip, new Date().toISOString()]
        );
    } catch (e) {
        console.error("Audit log failed:", e);
    }
};

// 数据库初始化
(async () => {
  try {
    await fs.ensureDir(path.join(__dirname, 'data'));
    await fs.ensureDir(path.join(__dirname, 'uploads'));
    await fs.ensureDir(path.join(__dirname, 'backups'));

    db = await open({
      filename: path.join(__dirname, 'data', 'database.sqlite'),
      driver: sqlite3.Database
    });

    console.log('✅ SQLite 数据库已连接 - 全业务模块就绪');

    // 初始化所有业务表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT,
        createdAt TEXT,
        updatedAt TEXT
      );
      CREATE TABLE IF NOT EXISTS role_permissions (
        role TEXT PRIMARY KEY,
        allowedTabs TEXT
      );
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        action TEXT,
        details TEXT,
        ip TEXT,
        timestamp TEXT
      );
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        content TEXT,
        items TEXT,
        category TEXT,
        officeArea TEXT,
        date TEXT,
        author TEXT,
        attachments TEXT,
        createdAt TEXT
      );
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        status TEXT,
        priority TEXT,
        officeArea TEXT,
        dueDate TEXT,
        completedAt TEXT,
        author TEXT,
        handler TEXT,
        attachments TEXT,
        createdAt TEXT
      );
      CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        model TEXT,
        sn TEXT,
        assetId TEXT,
        type TEXT,
        officeArea TEXT,
        location TEXT,
        manager TEXT,
        purchaseDate TEXT,
        warrantyDate TEXT,
        status TEXT,
        maintenanceHistory TEXT,
        author TEXT,
        attachments TEXT,
        createdAt TEXT,
        updatedAt TEXT
      );
      CREATE TABLE IF NOT EXISTS security_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        eventType TEXT,
        severity TEXT,
        sourceIp TEXT,
        targetIp TEXT,
        sourceMac TEXT, 
        location TEXT,
        officeArea TEXT,
        description TEXT,
        actionTaken TEXT,
        status TEXT,
        timestamp TEXT,
        author TEXT,
        attachments TEXT,
        createdAt TEXT
      );
      CREATE TABLE IF NOT EXISTS knowledge (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        category TEXT,
        content TEXT,
        remarks TEXT,
        attachments TEXT,
        author TEXT,
        createdAt TEXT,
        updatedAt TEXT
      );
      CREATE TABLE IF NOT EXISTS shared_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        category TEXT,
        author TEXT,
        role TEXT,
        attachments TEXT,
        createdAt TEXT
      );
      CREATE TABLE IF NOT EXISTS report_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        month TEXT,
        status TEXT,
        createdBy TEXT,
        createdAt TEXT
      );
      CREATE TABLE IF NOT EXISTS report_segments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        taskId INTEGER,
        segmentName TEXT,
        content TEXT,
        author TEXT,
        updatedAt TEXT
      );
      CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        content TEXT,
        isActive INTEGER DEFAULT 1,
        priority TEXT DEFAULT 'normal',
        author TEXT,
        createdAt TEXT
      );
      CREATE TABLE IF NOT EXISTS oa_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        type TEXT,
        version TEXT,
        content TEXT,
        status TEXT,
        date TEXT,
        author TEXT,
        attachments TEXT,
        createdAt TEXT
      );
    `);

    // --- DB MIGRATIONS ---
    try { await db.run("ALTER TABLE shared_files ADD COLUMN role TEXT"); } catch (e) {}
    try { await db.run("ALTER TABLE shared_files ADD COLUMN author TEXT"); } catch (e) {}
    try { await db.run("ALTER TABLE security_logs ADD COLUMN sourceMac TEXT"); } catch (e) {}
    try { await db.run("ALTER TABLE oa_events ADD COLUMN attachments TEXT"); } catch (e) {}
    try { await db.run("ALTER TABLE todos ADD COLUMN attachments TEXT"); } catch (e) {}
    try { await db.run("ALTER TABLE devices ADD COLUMN attachments TEXT"); } catch (e) {}
    try { await db.run("ALTER TABLE todos ADD COLUMN handler TEXT"); } catch (e) {} // Migration for handler

    // 初始化默认权限
    const permCount = await db.get('SELECT count(*) as count FROM role_permissions');
    if (permCount && permCount.count === 0) {
        await db.run('INSERT INTO role_permissions (role, allowedTabs) VALUES (?, ?)', ['ADMIN', JSON.stringify(['dashboard', 'tasks', 'security', 'oa-ops', 'data-share', 'devices', 'knowledge', 'timeline', 'add', 'stats', 'search', 'settings', 'ai-lab'])]);
        await db.run('INSERT INTO role_permissions (role, allowedTabs) VALUES (?, ?)', ['ENGINEER', JSON.stringify(['dashboard', 'tasks', 'devices', 'knowledge', 'timeline', 'add', 'search', 'settings', 'ai-lab', 'data-share', 'oa-ops'])]);
        await db.run('INSERT INTO role_permissions (role, allowedTabs) VALUES (?, ?)', ['SECURITY', JSON.stringify(['dashboard', 'security', 'timeline', 'search', 'settings', 'data-share'])]);
        await db.run('INSERT INTO role_permissions (role, allowedTabs) VALUES (?, ?)', ['OA_SPECIALIST', JSON.stringify(['dashboard', 'oa-ops', 'data-share', 'timeline', 'search', 'settings'])]);
        console.log("✅ 初始化角色权限表完成");
    }

    // 默认管理员
    const admin = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
    if (!admin) {
      await db.run('INSERT INTO users (username, password, role, createdAt) VALUES (?, ?, ?, ?)', 
        ['admin', 'admin888', 'ADMIN', new Date().toISOString()]);
      console.log('✅ Created default admin user');
    }

    // 加载上传路径配置
    const setting = await db.get('SELECT value FROM system_settings WHERE key = ?', ['upload_path']);
    if (setting && setting.value) {
      customUploadPath = setting.value;
      console.log(`📂 已加载自定义存储路径: ${customUploadPath}`);
    }

    // 初始化 app_config 默认值（首次启动时写入）
    const appCfgRow = await db.get('SELECT value FROM system_settings WHERE key = ?', ['app_config']);
    if (!appCfgRow) {
      const defaultAppConfig = {
        systemName: '技术部工作站',
        officeAreas: ['高朋办公区', '双林办公区'],
        categories: ['直播保障', '播控巡检', '演播室维保', '技术改造', '信号调度', '应急抢修', '交接班记录'],
        deviceTypes: ['视频切换台', '核心交换机', '编码/解码器', '存储服务器', '工作站', '监视器/大屏', '音频矩阵', '卫星接收机', 'UPS电源', '其他设备']
      };
      await db.run('INSERT INTO system_settings (key, value) VALUES (?, ?)', ['app_config', JSON.stringify(defaultAppConfig)]);
      console.log('✅ 初始化默认 app_config 完成');
    }

    startAutoBackup();

  } catch (err) {
    console.error('❌ 数据库初始化失败:', err);
  }
})();

const startAutoBackup = () => {
  const backupDB = async () => {
    try {
      const source = path.join(__dirname, 'data', 'database.sqlite');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const target = path.join(__dirname, 'backups', `db_backup_${timestamp}.sqlite`);
      const backupDir = path.join(__dirname, 'backups');
      const files = await fs.readdir(backupDir);
      const dbBackups = files.filter(f => f.startsWith('db_backup_')).sort();
      if (dbBackups.length >= 30) {
         await fs.unlink(path.join(backupDir, dbBackups[0]));
      }
      await fs.copy(source, target);
      console.log(`✅ 自动备份完成: ${target}`);
    } catch (e) {
      console.error('❌ 自动备份失败:', e);
    }
  };
  setInterval(backupDB, 86400000);
};

const getUploadRoot = () => {
  return customUploadPath || path.join(__dirname, 'uploads');
};

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    if (req.originalUrl.includes('/restore')) {
       cb(null, path.join(__dirname, 'data'));
       return;
    }
    const today = new Date().toISOString().split('T')[0];
    const root = getUploadRoot();
    
    // 获取用户名和模块名
    // 结构: uploads/YYYY-MM-DD/module/username/
    const username = req.query.username ? String(req.query.username).replace(/[\\/:*?"<>|]/g, '_') : 'system';
    const moduleName = req.query.module ? String(req.query.module).replace(/[\\/:*?"<>|]/g, '_') : 'common';
    
    const uploadPath = path.join(root, today, moduleName, username);
    try {
      await fs.ensureDir(uploadPath); 
      cb(null, uploadPath);
    } catch (err) {
      cb(err);
    }
  },
  filename: function (req, file, cb) {
    if (req.originalUrl.includes('/restore')) {
      cb(null, 'database_restoring.sqlite');
      return;
    }
    file.originalname = Buffer.from(file.originalname, "latin1").toString("utf8");
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});
const upload = multer({ storage: storage });

const processAttachments = (files) => {
  if (!files) return JSON.stringify([]);
  return JSON.stringify(files.map(f => {
    const root = getUploadRoot();
    // 计算相对路径
    let relativePath = path.relative(root, f.path).replace(/\\/g, '/');
    if (relativePath.startsWith('/')) relativePath = relativePath.substring(1);
    
    return {
      name: f.originalname,
      url: `/uploads/${relativePath}`, // 统一通过 /uploads 路由访问
      type: f.mimetype
    };
  }));
};

app.use('/uploads', (req, res, next) => {
  const root = getUploadRoot();
  express.static(root)(req, res, next);
});
app.use(express.static(path.join(__dirname, 'dist')));


// ================= API =================

// --- Auth ---
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
  if (user) {
    const perm = await db.get('SELECT allowedTabs FROM role_permissions WHERE role = ?', [user.role]);
    const allowedTabs = perm ? JSON.parse(perm.allowedTabs) : [];
    await logAudit(username, 'LOGIN', '用户登录系统', req);
    res.json({ 
      success: true, 
      user: { username: user.username, role: user.role },
      allowedTabs
    });
  } else {
    res.json({ success: false, message: 'Invalid credentials' });
  }
});

app.post('/api/auth/validate', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.json({ valid: false });
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (user) {
        const perm = await db.get('SELECT allowedTabs FROM role_permissions WHERE role = ?', [user.role]);
        const allowedTabs = perm ? JSON.parse(perm.allowedTabs) : [];
        res.json({ valid: true, role: user.role, allowedTabs });
    } else {
        res.json({ valid: false });
    }
});

// --- Profile Export (Self) ---
app.get('/api/profile/export', async (req, res) => {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Missing username' });
    
    try {
        const logs = await db.all('SELECT * FROM logs WHERE author = ?', [username]);
        const todos = await db.all('SELECT * FROM todos WHERE author = ?', [username]);
        const securityLogs = await db.all('SELECT * FROM security_logs WHERE author = ?', [username]);
        const oaEvents = await db.all('SELECT * FROM oa_events WHERE author = ?', [username]);
        const devices = await db.all('SELECT * FROM devices WHERE author = ? OR manager = ?', [username, username]);
        const knowledge = await db.all('SELECT * FROM knowledge WHERE author = ?', [username]);
        
        await logAudit(username, 'EXPORT_DATA', '导出个人全量数据', req);
        
        res.json({
            meta: { username, exportDate: new Date().toISOString() },
            data: { logs, todos, securityLogs, oaEvents, devices, knowledge }
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Export failed' });
    }
});

// --- Users (Admin Only) ---
app.get('/api/users', async (req, res) => {
    const users = await db.all('SELECT id, username, role, createdAt FROM users ORDER BY createdAt DESC');
    res.json(users);
});

app.post('/api/users', async (req, res) => {
    const { username, password, role, operator } = req.body;
    try {
        await db.run('INSERT INTO users (username, password, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', 
            [username, password, role, new Date().toISOString(), new Date().toISOString()]);
        await logAudit(operator, 'CREATE_USER', `创建用户: ${username} (${role})`, req);
        res.json({ success: true });
    } catch(e) {
        res.status(400).json({ success: false, message: '用户已存在或创建失败' });
    }
});

app.post('/api/users/batch', async (req, res) => {
    const { users, operator } = req.body; // users = [{username, password, role}]
    let count = 0;
    for (const u of users) {
        try {
            await db.run('INSERT INTO users (username, password, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', 
                [u.username, u.password, u.role, new Date().toISOString(), new Date().toISOString()]);
            count++;
        } catch(e) {} // Skip duplicates
    }
    await logAudit(operator, 'BATCH_IMPORT_USER', `批量导入用户: ${count}个`, req);
    res.json({ success: true, count });
});

app.put('/api/users/:id', async (req, res) => {
    const { password, role, operator } = req.body;
    if (password) {
        await db.run('UPDATE users SET password = ?, updatedAt = ? WHERE id = ?', [password, new Date().toISOString(), req.params.id]);
    }
    if (role) {
        await db.run('UPDATE users SET role = ?, updatedAt = ? WHERE id = ?', [role, new Date().toISOString(), req.params.id]);
    }
    await logAudit(operator, 'UPDATE_USER', `更新用户ID: ${req.params.id}`, req);
    res.json({ success: true });
});

app.delete('/api/users/:id', async (req, res) => {
    const { operator } = req.query;
    await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
    await logAudit(operator, 'DELETE_USER', `删除用户ID: ${req.params.id}`, req);
    res.json({ success: true });
});

// --- Role Permissions ---
app.get('/api/permissions', async (req, res) => {
    const perms = await db.all('SELECT * FROM role_permissions');
    res.json(perms.map(p => ({ role: p.role, allowedTabs: JSON.parse(p.allowedTabs) })));
});

app.post('/api/permissions', async (req, res) => {
    const { role, allowedTabs, operator } = req.body;
    await db.run('INSERT OR REPLACE INTO role_permissions (role, allowedTabs) VALUES (?, ?)', [role, JSON.stringify(allowedTabs)]);
    await logAudit(operator, 'UPDATE_PERMISSION', `更新角色权限: ${role}`, req);
    res.json({ success: true });
});

// --- Settings (Path & AI) ---
app.get('/api/settings/upload-path', (req, res) => {
  res.json({ path: getUploadRoot(), isCustom: !!customUploadPath });
});

app.post('/api/settings/upload-path', async (req, res) => {
  const { path: newPath } = req.body;
  if (!newPath) return res.status(400).json({ success: false, message: '路径不能为空' });
  try {
    await fs.ensureDir(newPath);
    const testFile = path.join(newPath, '.write_test');
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
    await db.run('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['upload_path', newPath]);
    customUploadPath = newPath;
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false, message: `路径无效: ${e.message}` });
  }
});

app.delete('/api/settings/upload-path', async (req, res) => {
  await db.run('DELETE FROM system_settings WHERE key = ?', ['upload_path']);
  customUploadPath = '';
  res.json({ success: true });
});

// --- App Config (officeAreas, categories, deviceTypes, systemName) ---
app.get('/api/settings/app-config', async (req, res) => {
  const row = await db.get('SELECT value FROM system_settings WHERE key = ?', ['app_config']);
  if (row) {
    res.json(JSON.parse(row.value));
  } else {
    res.json({ systemName: '技术部工作站', officeAreas: ['高朋办公区', '双林办公区'], categories: ['直播保障', '播控巡检', '演播室维保', '技术改造', '信号调度', '应急抢修', '交接班记录'], deviceTypes: ['视频切换台', '核心交换机', '编码/解码器', '存储服务器', '工作站', '监视器/大屏', '音频矩阵', '卫星接收机', 'UPS电源', '其他设备'] });
  }
});

app.post('/api/settings/app-config', async (req, res) => {
  const { config, operator } = req.body;
  if (!config) return res.status(400).json({ success: false, message: '配置不能为空' });
  await db.run('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['app_config', JSON.stringify(config)]);
  await logAudit(operator, 'UPDATE_APP_CONFIG', '更新系统标签配置', req);
  res.json({ success: true });
});

app.get('/api/settings/ai', async (req, res) => {
  const setting = await db.get('SELECT value FROM system_settings WHERE key = ?', ['ai_config']);
  res.json(setting ? JSON.parse(setting.value) : null);
});

app.post('/api/settings/ai', async (req, res) => {
    const { config, operator } = req.body;
    await db.run('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)', ['ai_config', JSON.stringify(config)]);
    await logAudit(operator, 'UPDATE_AI_CONFIG', '更新AI智脑配置', req);
    res.json({ success: true });
});

// --- Announcements ---
app.get('/api/announcements', async (req, res) => {
    const { activeOnly } = req.query;
    let sql = 'SELECT * FROM announcements ORDER BY createdAt DESC';
    if (activeOnly) sql = 'SELECT * FROM announcements WHERE isActive = 1 ORDER BY priority DESC, createdAt DESC';
    res.json(await db.all(sql));
});

app.post('/api/announcements', async (req, res) => {
    const { title, content, priority, author } = req.body;
    await db.run('INSERT INTO announcements (title, content, priority, author, createdAt) VALUES (?, ?, ?, ?, ?)', 
        [title, content, priority, author, new Date().toISOString()]);
    await logAudit(author, 'CREATE_ANNOUNCEMENT', `发布公告: ${title}`, req);
    res.json({ success: true });
});

app.delete('/api/announcements/:id', async (req, res) => {
    const { operator } = req.query;
    await db.run('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    await logAudit(operator, 'DELETE_ANNOUNCEMENT', `删除公告ID: ${req.params.id}`, req);
    res.json({ success: true });
});

app.put('/api/announcements/:id/status', async (req, res) => {
    const { isActive } = req.body;
    await db.run('UPDATE announcements SET isActive = ? WHERE id = ?', [isActive ? 1 : 0, req.params.id]);
    res.json({ success: true });
});

// --- Audit Logs ---
app.get('/api/audit', async (req, res) => {
    const logs = await db.all('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1000');
    res.json(logs);
});

// --- Logs (Business) ---
app.get('/api/logs', async (req, res) => {
  const { page, limit } = req.query;
  let query = 'SELECT * FROM logs ORDER BY date DESC';
  const params = [];
  if (page && limit) {
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);
  }
  const logs = await db.all(query, params);
  const formatted = logs.map(l => ({ ...l, items: JSON.parse(l.items||'[]'), attachments: JSON.parse(l.attachments||'[]') }));
  if (page && limit) {
     const c = await db.get('SELECT COUNT(*) as count FROM logs');
     res.json({ data: formatted, total: c.count });
  } else {
     res.json(formatted);
  }
});

app.post('/api/logs', upload.array('files'), async (req, res) => {
  const { title, content, items, category, officeArea, date, author } = req.body;
  const result = await db.run(
    `INSERT INTO logs (title, content, items, category, officeArea, date, author, attachments, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, content, items, category, officeArea, date, author, processAttachments(req.files), new Date().toISOString()]
  );
  res.json({ success: true, id: result.lastID });
});

app.delete('/api/logs/:id', async (req, res) => {
  await db.run('DELETE FROM logs WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// --- Todos ---
app.get('/api/todos', async (req, res) => {
  const todos = await db.all('SELECT * FROM todos ORDER BY createdAt DESC');
  res.json(todos.map(t => ({...t, attachments: JSON.parse(t.attachments||'[]')})));
});

app.post('/api/todos', upload.array('files'), async (req, res) => {
  // removed handler from creation
  const { title, description, status, priority, officeArea, dueDate, author } = req.body;
  const result = await db.run(
    `INSERT INTO todos (title, description, status, priority, officeArea, dueDate, author, handler, attachments, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description, status, priority, officeArea, dueDate, author, null, processAttachments(req.files), new Date().toISOString()]
  );
  res.json({ success: true, id: result.lastID });
});

app.patch('/api/todos/:id', async (req, res) => {
  const { status, completedAt, handler } = req.body;
  // If handler is provided (e.g. on status change), update it
  if (handler) {
      await db.run('UPDATE todos SET status = ?, completedAt = ?, handler = ? WHERE id = ?', [status, completedAt, handler, req.params.id]);
  } else {
      await db.run('UPDATE todos SET status = ?, completedAt = ? WHERE id = ?', [status, completedAt, req.params.id]);
  }
  res.json({ success: true });
});

app.delete('/api/todos/:id', async (req, res) => {
  await db.run('DELETE FROM todos WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// --- Shared Files ---
app.get('/api/shared-files', async (req, res) => {
  const files = await db.all('SELECT * FROM shared_files ORDER BY createdAt DESC');
  res.json(files.map(f => ({ ...f, attachments: JSON.parse(f.attachments||'[]') })));
});

app.post('/api/shared-files', upload.array('files'), async (req, res) => {
  const { title, description, category, author, role } = req.body;
  await db.run(
    `INSERT INTO shared_files (title, description, category, author, role, attachments, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, description, category, author, role, processAttachments(req.files), new Date().toISOString()]
  );
  res.json({ success: true });
});

app.delete('/api/shared-files/:id', async (req, res) => {
  await db.run('DELETE FROM shared_files WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// --- OA Events ---
app.get('/api/oa-events', async (req, res) => res.json((await db.all('SELECT * FROM oa_events ORDER BY date DESC')).map(e => ({...e, attachments: JSON.parse(e.attachments||'[]')}))));

app.post('/api/oa-events', upload.array('files'), async (req, res) => {
    const { title, type, version, content, status, date, author } = req.body;
    const r = await db.run(`INSERT INTO oa_events (title, type, version, content, status, date, author, attachments, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
        [title, type, version, content, status, date, author, processAttachments(req.files), new Date().toISOString()]);
    res.json({ success: true, id: r.lastID });
});

app.put('/api/oa-events/:id', upload.array('files'), async (req, res) => {
    const { title, type, version, content, status, date, author } = req.body;
    // NOTE: Simple update overwrites attachments if new ones provided, or keeps old if logic handled. 
    // For simplicity in this demo, if files provided, we update attachments. Real world needs append logic.
    // Since UI usually just adds, let's just append if we could, but SQL requires read-modify-write.
    // For now, we will just support adding new ones via separate logic or overwrite.
    // Let's assume edit doesn't change attachments in this simple iteration unless we implement append logic.
    // Or we can just update other fields.
    if (req.files && req.files.length > 0) {
       // If files are uploaded during update, we replace (or append logic needed).
       // To be safe, we only update text fields if no files, or update all if files.
       const newAttachments = processAttachments(req.files);
       await db.run(`UPDATE oa_events SET title=?, type=?, version=?, content=?, status=?, date=?, author=?, attachments=? WHERE id=?`, 
           [title, type, version, content, status, date, author, newAttachments, req.params.id]);
    } else {
       await db.run(`UPDATE oa_events SET title=?, type=?, version=?, content=?, status=?, date=?, author=? WHERE id=?`, 
           [title, type, version, content, status, date, author, req.params.id]);
    }
    res.json({ success: true });
});

app.delete('/api/oa-events/:id', async (req, res) => {
    await db.run('DELETE FROM oa_events WHERE id = ?', [req.params.id]);
    res.json({ success: true });
});

// --- Other Entities ---
app.get('/api/devices', async (req, res) => res.json((await db.all('SELECT * FROM devices ORDER BY updatedAt DESC')).map(d => ({...d, maintenanceHistory: JSON.parse(d.maintenanceHistory||'[]'), attachments: JSON.parse(d.attachments||'[]')}))));

app.post('/api/devices', upload.array('files'), async (req, res) => {
    const { name, model, sn, assetId, type, officeArea, location, manager, purchaseDate, warrantyDate, status, maintenanceHistory, author } = req.body;
    const r = await db.run(`INSERT INTO devices (name, model, sn, assetId, type, officeArea, location, manager, purchaseDate, warrantyDate, status, maintenanceHistory, author, attachments, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
        [name, model, sn, assetId, type, officeArea, location, manager, purchaseDate, warrantyDate, status, JSON.stringify(maintenanceHistory || []), author, processAttachments(req.files), new Date().toISOString(), new Date().toISOString()]);
    res.json({ success: true, id: r.lastID });
});

app.put('/api/devices/:id', upload.array('files'), async (req, res) => {
    const { name, model, sn, assetId, type, officeArea, location, manager, purchaseDate, warrantyDate, status, maintenanceHistory } = req.body;
    
    if (req.files && req.files.length > 0) {
        const newAttachments = processAttachments(req.files);
        await db.run(`UPDATE devices SET name=?, model=?, sn=?, assetId=?, type=?, officeArea=?, location=?, manager=?, purchaseDate=?, warrantyDate=?, status=?, maintenanceHistory=?, attachments=?, updatedAt=? WHERE id=?`, 
            [name, model, sn, assetId, type, officeArea, location, manager, purchaseDate, warrantyDate, status, JSON.stringify(maintenanceHistory || []), newAttachments, new Date().toISOString(), req.params.id]);
    } else {
        await db.run(`UPDATE devices SET name=?, model=?, sn=?, assetId=?, type=?, officeArea=?, location=?, manager=?, purchaseDate=?, warrantyDate=?, status=?, maintenanceHistory=?, updatedAt=? WHERE id=?`, 
            [name, model, sn, assetId, type, officeArea, location, manager, purchaseDate, warrantyDate, status, JSON.stringify(maintenanceHistory || []), new Date().toISOString(), req.params.id]);
    }
    res.json({ success: true });
});

app.delete('/api/devices/:id', async (req, res) => { await db.run('DELETE FROM devices WHERE id = ?', [req.params.id]); res.json({ success: true }); });

app.get('/api/security', async (req, res) => res.json((await db.all('SELECT * FROM security_logs ORDER BY timestamp DESC')).map(l => ({...l, attachments: JSON.parse(l.attachments||'[]')}))));
app.post('/api/security', upload.array('files'), async (req, res) => {
    const { eventType, severity, sourceIp, targetIp, sourceMac, location, officeArea, description, actionTaken, status, timestamp, author } = req.body;
    const r = await db.run(`INSERT INTO security_logs (eventType, severity, sourceIp, targetIp, sourceMac, location, officeArea, description, actionTaken, status, timestamp, author, attachments, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [eventType, severity, sourceIp, targetIp, sourceMac, location, officeArea, description, actionTaken, status, timestamp, author, processAttachments(req.files), new Date().toISOString()]);
    res.json({ success: true, id: r.lastID });
});
app.delete('/api/security/:id', async (req, res) => { await db.run('DELETE FROM security_logs WHERE id = ?', [req.params.id]); res.json({ success: true }); });

app.get('/api/knowledge', async (req, res) => res.json((await db.all('SELECT * FROM knowledge ORDER BY updatedAt DESC')).map(e => ({...e, attachments: JSON.parse(e.attachments||'[]')}))));
app.post('/api/knowledge', upload.array('files'), async (req, res) => {
    const { title, category, content, remarks, author } = req.body;
    const r = await db.run(`INSERT INTO knowledge (title, category, content, remarks, attachments, author, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [title, category, content, remarks, processAttachments(req.files), author, new Date().toISOString(), new Date().toISOString()]);
    res.json({ success: true, id: r.lastID });
});
app.put('/api/knowledge/:id', async (req, res) => {
    const { title, category, content, remarks } = req.body;
    await db.run(`UPDATE knowledge SET title=?, category=?, content=?, remarks=?, updatedAt=? WHERE id=?`, [title, category, content, remarks, new Date().toISOString(), req.params.id]);
    res.json({ success: true });
});
app.delete('/api/knowledge/:id', async (req, res) => { await db.run('DELETE FROM knowledge WHERE id = ?', [req.params.id]); res.json({ success: true }); });

app.get('/api/reports/tasks', async (req, res) => res.json(await db.all('SELECT * FROM report_tasks ORDER BY createdAt DESC')));
app.post('/api/reports/tasks', async (req, res) => {
    const { title, month, status, createdBy } = req.body;
    const r = await db.run(`INSERT INTO report_tasks (title, month, status, createdBy, createdAt) VALUES (?, ?, ?, ?, ?)`, [title, month, status, createdBy, new Date().toISOString()]);
    res.json({ success: true, id: r.lastID });
});
app.delete('/api/reports/tasks/:id', async (req, res) => { await db.run('DELETE FROM report_tasks WHERE id = ?', [req.params.id]); await db.run('DELETE FROM report_segments WHERE taskId = ?', [req.params.id]); res.json({ success: true }); });
app.get('/api/reports/segments', async (req, res) => res.json(await db.all('SELECT * FROM report_segments WHERE taskId = ?', [req.query.taskId])));
app.post('/api/reports/segments', async (req, res) => {
    const { taskId, segmentName, content, author } = req.body;
    await db.run(`INSERT INTO report_segments (taskId, segmentName, content, author, updatedAt) VALUES (?, ?, ?, ?, ?)`, [taskId, segmentName, content, author, new Date().toISOString()]);
    res.json({ success: true });
});
app.delete('/api/reports/segments/:id', async (req, res) => { await db.run('DELETE FROM report_segments WHERE id = ?', [req.params.id]); res.json({ success: true }); });

// --- Admin (Backup/Restore) ---
app.get('/api/admin/backup', (req, res) => res.download(path.join(__dirname, 'data', 'database.sqlite'), `backup_${new Date().toISOString().split('T')[0]}.sqlite`));
app.post('/api/admin/restore', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false });
    await db.close();
    await fs.move(path.join(__dirname, 'data', 'database_restoring.sqlite'), path.join(__dirname, 'data', 'database.sqlite'), { overwrite: true });
    db = await open({ filename: path.join(__dirname, 'data', 'database.sqlite'), driver: sqlite3.Database });
    res.json({ success: true });
});

app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) res.sendFile(indexPath);
  else res.send('API Server Running.');
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
