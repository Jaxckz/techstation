
export const DEFAULT_CATEGORIES = [
  '直播保障',
  '播控巡检',
  '演播室维保',
  '技术改造',
  '信号调度',
  '应急抢修',
  '交接班记录'
] as const;

export const SECURITY_EVENT_TYPES = [
  '非法侵入',
  '木马病毒',
  'DDoS攻击',
  '暴力破解',
  '漏洞利用',
  '异常流量',
  '勒索软件',
  '内部违规'
] as const;

export const BROADCAST_LOCATIONS = [
  '播控中心',
  '总控机房',
  '1号演播室 (4K/8K)',
  '2号演播室',
  '虚拟演播室',
  '融媒体中心',
  '卫星地面站',
  '转播车'
] as const;

export const DEVICE_TYPES = [
  '视频切换台',
  '核心交换机',
  '编码/解码器',
  '存储服务器',
  '工作站',
  '监视器/大屏',
  '音频矩阵',
  '卫星接收机',
  'UPS电源',
  '其他设备'
] as const;

export const DEVICE_STATUS = [
  '在运 (Active)',
  '备用 (Standby)',
  '维修 (Repairing)',
  '报废 (Retired)'
] as const;

export const OFFICE_AREAS = [
  '高朋办公区',
  '双林办公区'
] as const;

export const IMAGE_AREAS = [
  '机房全景',
  '设备细节',
  '故障表现',
  '环境凭证'
] as const;

export type UserRole = 'ADMIN' | 'ENGINEER' | 'SECURITY';

export interface UserAccount {
  id?: number;
  username: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface RolePermission {
  role: UserRole;
  allowedTabs: string[];
}

export interface NavItem {
  id: string;
  label: string;
  icon: any;
  shortcut?: string;
  roles?: UserRole[];
}

export type LogCategory = typeof DEFAULT_CATEGORIES[number] | string;
export type SecurityEventType = typeof SECURITY_EVENT_TYPES[number];
export type BroadcastLocation = typeof BROADCAST_LOCATIONS[number] | string;
export type OfficeArea = typeof OFFICE_AREAS[number] | string;
export type DeviceType = typeof DEVICE_TYPES[number];
export type DeviceStatus = typeof DEVICE_STATUS[number];

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';
export type SecurityStatus = 'pending' | 'blocked' | 'resolved' | 'reported';
export type TodoStatus = 'pending' | 'processing' | 'completed';
export type TodoPriority = 'low' | 'medium' | 'high';

export interface AppSettings {
  id: string;
  theme?: string;
}

export interface AuthConfig {
  role: UserRole;
  password: string;
}

export interface MaintenanceRecord {
  id: string;
  date: Date;
  content: string;
  technician: string;
}

export interface DeviceEntry {
  id?: number;
  name: string;
  model: string;
  sn: string;
  assetId: string;
  type: DeviceType;
  officeArea: OfficeArea;
  location: string;
  manager: string;
  purchaseDate: string;
  warrantyDate: string;
  status: DeviceStatus;
  maintenanceHistory: MaintenanceRecord[];
  createdAt: Date;
  updatedAt: Date;
  author: string;
}

export interface LogEntry {
  id?: number;
  title: string;
  content: string;
  items: string[];
  category: string; 
  location?: string;
  officeArea: string; 
  date: Date;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
  author: string;
  isCritical?: boolean;
  signalPath?: string[];
  equipmentModel?: string;
  attachmentLabels?: Record<string, string>;
}

export interface SecurityLogEntry {
  id?: number;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  sourceIp: string;
  targetIp: string;
  sourceMac?: string;
  location: string;
  officeArea: string;
  description: string;
  actionTaken: string;
  status: SecurityStatus;
  timestamp: Date;
  createdAt: Date;
  author: string;
  attachments?: string[]; // 新增附件支持
}

export interface TodoEntry {
  id?: number;
  title: string;
  description: string;
  status: TodoStatus;
  priority: TodoPriority;
  officeArea?: string;
  createdAt: Date;
  dueDate?: Date;
  completedAt?: Date;
  author: string;
}

export interface KnowledgeEntry {
  id?: number;
  title: string;
  category: string;
  content: string;
  remarks: string;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
  author: string;
}

export interface LogImage {
  id: string;
  blob: Blob;
  name: string;
  type: string;
  label?: string; 
}

export interface SyncPayload {
  log?: LogEntry;
  securityLog?: SecurityLogEntry;
  todo?: TodoEntry;
  device?: DeviceEntry;
  knowledge?: KnowledgeEntry;
  user?: UserAccount;
  permission?: RolePermission;
  attachmentBlobs?: { id: string, blob: Blob, name: string, type: string, label?: string }[];
  fullLogs?: LogEntry[];
  fullTodos?: TodoEntry[];
  fullDevices?: DeviceEntry[];
  fullKnowledge?: KnowledgeEntry[];
  fullUsers?: UserAccount[];
  fullPermissions?: RolePermission[];
}

export interface SyncMessage {
  type: 'LOG_SUBMIT' | 'SECURITY_SUBMIT' | 'TODO_SUBMIT' | 'HELLO' | 'DB_PULL_REQUEST' | 'DB_PULL_RESPONSE';
  payload: SyncPayload | any;
  sender: string;
}

export interface AuditLogEntry {
  id?: number;
  username: string;
  action: 'LOGIN' | 'LOGOUT' | 'NAVIGATE' | 'SENSITIVE_DELETE' | 'EXPORT_DATA';
  details: string;
  ip: string;
  timestamp: Date;
}

export interface ReportTask {
  id?: number;
  month: string; 
  title: string;
  status: 'draft' | 'finalizing' | 'completed';
  createdAt: Date;
  createdBy: string;
}

export interface ReportSegment {
  id?: number;
  taskId: number;
  segmentName: string; 
  content: string;
  author: string;
  updatedAt: Date;
  attachments: string[];
}
