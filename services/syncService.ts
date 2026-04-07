
import { Peer, DataConnection } from 'peerjs';
import { SyncMessage, LogEntry, SecurityLogEntry, DeviceEntry, KnowledgeEntry, UserAccount, RolePermission } from '../types';
import { db } from '../db';

class SyncService {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private onMessageCallback: ((msg: SyncMessage) => void) | null = null;
  private onConnectionChange: ((count: number, peers: string[]) => void) | null = null;
  public myId: string = '';

  init(onReady: (id: string) => void) {
    if (this.peer && !this.peer.destroyed) {
      if (this.myId) onReady(this.myId);
      return;
    }
    
    // 配置 STUN 服务器辅助穿透内网/防火墙
    this.peer = new Peer({
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    this.peer.on('open', (id: string) => {
      console.log(`[P2P] 节点就绪 ID: ${id}`);
      this.myId = id;
      onReady(id);
    });

    this.peer.on('connection', (conn: DataConnection) => {
      this.setupConnectionHandlers(conn);
    });

    this.peer.on('error', (err: any) => {
      console.warn('P2P 错误:', err.type, err.message);
      if (err.type === 'peer-unavailable') {
        alert("无法连接目标节点：对方可能未在线或 ID 输入错误。");
      }
    });

    this.peer.on('disconnected', () => {
      console.log('P2P 断开，尝试重连...');
      this.peer?.reconnect();
    });
  }

  private setupConnectionHandlers(conn: DataConnection) {
    conn.on('open', () => {
      console.log(`[P2P] 新连接: ${conn.peer}`);
      this.connections.set(conn.peer, conn);
      this.notifyConnectionChange();
    });

    conn.on('data', async (data: any) => {
      const msg = data as SyncMessage;
      await this.handleMessage(msg, conn);
    });

    conn.on('close', () => {
      console.log(`[P2P] 连接关闭: ${conn.peer}`);
      this.connections.delete(conn.peer);
      this.notifyConnectionChange();
    });
    
    conn.on('error', (err) => {
      console.error('连接异常:', err);
      this.connections.delete(conn.peer);
      this.notifyConnectionChange();
    });
  }

  private notifyConnectionChange() {
    if (this.onConnectionChange) {
      const peers = Array.from(this.connections.keys());
      this.onConnectionChange(this.connections.size, peers);
    }
  }

  public setConnectionListener(cb: (count: number, peers: string[]) => void) {
    this.onConnectionChange = cb;
    // 立即回调当前状态
    const peers = Array.from(this.connections.keys());
    cb(this.connections.size, peers);
  }

  connectToHub(targetId: string, onConnected: () => void) {
    if (!targetId) return;
    if (!this.peer || this.peer.destroyed) {
      this.init(() => this.connectToHub(targetId, onConnected));
      return;
    }
    
    // 如果已经连接，直接回调
    if (this.connections.has(targetId)) {
      onConnected();
      return;
    }

    const conn = this.peer.connect(targetId, {
      reliable: true
    });

    conn.on('open', () => {
      this.setupConnectionHandlers(conn);
      onConnected();
    });
  }

  private async handleMessage(msg: SyncMessage, conn: DataConnection) {
    try {
      if (msg.type === 'DB_PULL_REQUEST') {
        console.log(`收到 ${msg.sender} 的全量同步请求`);
        const payload = {
          fullLogs: await db.logs.toArray(),
          fullTodos: await db.todos.toArray(),
          fullDevices: await db.devices.toArray(),
          fullUsers: await db.users.toArray(),
          fullPermissions: await db.rolePermissions.toArray(),
          attachmentBlobs: await db.images.toArray()
        };
        conn.send({ type: 'DB_PULL_RESPONSE', sender: this.myId, payload });
        return;
      }

      if (msg.type === 'DB_PULL_RESPONSE') {
        console.log(`收到来自 ${msg.sender} 的全量数据响应`);
        const p = msg.payload;
        if (p.attachmentBlobs) for (const img of p.attachmentBlobs) await db.images.put(img);
        if (p.fullLogs) for (const l of p.fullLogs) await db.logs.put(l);
        if (p.fullTodos) for (const t of p.fullTodos) await db.todos.put(t);
        if (p.fullUsers) for (const u of p.fullUsers) await db.users.put(u);
        if (p.fullPermissions) for (const perm of p.fullPermissions) await db.rolePermissions.put(perm);
        return;
      }

      // 实时增量更新
      const { log, securityLog, todo, device, knowledge, user, permission, attachmentBlobs } = msg.payload;
      if (attachmentBlobs) for (const img of attachmentBlobs) await db.images.put(img);
      if (log) await db.logs.put(log);
      if (securityLog) await db.securityLogs.put(securityLog);
      if (todo) await db.todos.put(todo);
      if (device) await db.devices.put(device);
      if (knowledge) await db.knowledge.put(knowledge);
      if (user) await db.users.put(user);
      if (permission) await db.rolePermissions.put(permission);

      if (this.onMessageCallback) this.onMessageCallback(msg);
    } catch (err) {
      console.error('P2P 数据处理失败:', err);
    }
  }

  requestHistorySync() {
    this.connections.forEach(conn => {
      if (conn.open) conn.send({ type: 'DB_PULL_REQUEST', sender: this.myId, payload: {} });
    });
  }

  async sendLog(log: LogEntry) {
    const attachmentBlobs = [];
    if (log.attachments?.length) {
      for (const id of log.attachments) {
        const img = await db.images.get(id);
        if (img) attachmentBlobs.push(img);
      }
    }
    this.broadcast({ type: 'LOG_SUBMIT', sender: this.myId, payload: { log, attachmentBlobs } });
  }

  async sendSecurity(securityLog: SecurityLogEntry) {
    this.broadcast({ type: 'SECURITY_SUBMIT', sender: this.myId, payload: { securityLog } });
  }

  async sendUser(user: UserAccount) {
    this.broadcast({ type: 'HELLO', sender: this.myId, payload: { user } });
  }

  private broadcast(msg: SyncMessage) {
    this.connections.forEach(conn => {
      if (conn.open) conn.send(msg);
    });
  }

  setCallback(cb: (msg: SyncMessage) => void) {
    this.onMessageCallback = cb;
  }
}

export const syncService = new SyncService();
