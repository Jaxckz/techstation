
import { db } from '../db';

class StorageService {
  private directoryHandle: FileSystemDirectoryHandle | null = null;

  isSupported(): boolean {
    return 'showDirectoryPicker' in window;
  }

  isSecureContext(): boolean {
    return window.isSecureContext;
  }

  async requestPersistence(): Promise<boolean> {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persisted();
      if (isPersisted) return true;
      return await navigator.storage.persist();
    }
    return false;
  }

  async checkPersistence(): Promise<boolean> {
    if (navigator.storage && navigator.storage.persisted) {
      return await navigator.storage.persisted();
    }
    return false;
  }

  async mountVault(): Promise<string | null> {
    if (!this.isSupported()) {
      alert("浏览器不支持 File System Access API。请使用 Chrome/Edge 桌面版。");
      return null;
    }
    // 允许用户在不安全环境下尝试，但给出明确的 Flags 提示
    if (!this.isSecureContext()) {
      const confirmed = confirm("检测到非 HTTPS/Localhost 环境。\n\n浏览器默认禁用磁盘访问。如果您已配置 'Insecure origins treated as secure' Flag，请点击确定继续。\n\n否则请点击取消，并查看设置页的配置教程。");
      if (!confirmed) return null;
    }

    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      this.directoryHandle = handle;
      await db.settings.put({ id: 'vault_handle', handle });
      return handle.name;
    } catch (e: any) {
      console.error("Mount failed:", e);
      return null;
    }
  }

  async getExistingHandle(): Promise<FileSystemDirectoryHandle | null> {
    const record = await db.settings.get('vault_handle');
    if (record && record.handle) {
      this.directoryHandle = record.handle;
      // 检查权限，如果不具备则静默失败，等待用户重新点击挂载
      try {
        const perm = await (record.handle as any).queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') return record.handle;
      } catch (e) {
        return null;
      }
      return record.handle;
    }
    return null;
  }

  async verifyPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
    const options = { mode: 'readwrite' };
    try {
      if ((await (handle as any).queryPermission(options)) === 'granted') return true;
      if ((await (handle as any).requestPermission(options)) === 'granted') return true;
    } catch (e) {
      console.warn("Permission check failed:", e);
    }
    return false;
  }

  // 递归创建文件夹: path = "2024-05-20/Title"
  async ensureDirectory(handle: FileSystemDirectoryHandle, path: string): Promise<FileSystemDirectoryHandle> {
    let current = handle;
    const parts = path.split('/').filter(Boolean);
    for (const part of parts) {
      current = await current.getDirectoryHandle(part, { create: true });
    }
    return current;
  }

  async saveOriginalFile(file: Blob, subPath: string, fileName: string): Promise<boolean> {
    if (!this.directoryHandle) return false;

    try {
      const hasPerm = await this.verifyPermission(this.directoryHandle);
      if (!hasPerm) return false;

      // 递归创建目录
      const targetDir = await this.ensureDirectory(this.directoryHandle, subPath);
      
      // 写入文件
      const fileHandle = await targetDir.getFileHandle(fileName, { create: true });
      const writable = await (fileHandle as any).createWritable();
      await writable.write(file);
      await writable.close();
      return true;
    } catch (e) {
      console.error("Physical Save Failed:", e);
      return false;
    }
  }

  async compressForPreview(file: File): Promise<Blob> {
    if (!file.type.startsWith('image/')) return file;
    
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1000; // 稍微提高预览图质量
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDim) {
          height *= maxDim / width; width = maxDim;
        } else if (height > maxDim) {
          width *= maxDim / height; height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.7);
      };
      img.src = url;
    });
  }
}

export const storageService = new StorageService();
