import { registerPlugin } from '@capacitor/core';

export interface LocalServerPlugin {
  startServer(options: { port: number }): Promise<{ status: string; port: number }>;
  connectToServer(options: { ip?: string; port?: number; url?: string; isOnline?: boolean }): Promise<void>;
  stopAll(): Promise<void>;
  sendMessage(options: { message: string }): Promise<void>;
  getStatus(): Promise<{ role: string; status: string; clientCount: number; localIp: string }>;
  getLocalIpAddress(): Promise<{ ip: string }>;
  addListener(eventName: 'onStatusUpdate', listenerFunc: (info: { role: string; status: string; clientCount: number; localIp: string }) => void): any;
  addListener(eventName: 'onMessageReceived', listenerFunc: (info: { clientId?: string; message: string }) => void): any;
  addListener(eventName: 'onLog', listenerFunc: (info: { message: string; type: string; timestamp: number }) => void): any;
  addListener(eventName: 'onMessage', listenerFunc: (info: { message: string }) => void): any;
  addListener(eventName: 'onConnectionStateChanged', listenerFunc: (info: { state: string }) => void): any;
  addListener(eventName: 'onPeerJoined', listenerFunc: (info: { deviceId: string }) => void): any;
  addListener(eventName: 'onPeerLeft', listenerFunc: (info: { deviceId: string }) => void): any;
}

export const LocalServer = registerPlugin<LocalServerPlugin>('LocalServer');
