import { IGameService, GameServiceConfig, GameAction } from './IGameService';
import appConfig from '../config.json';
import { PluginListenerHandle } from '@capacitor/core';
import { LocalServer } from '../lib/cap-net-server'; 

export class LANGameService_AndroidNative implements IGameService {
  public onMessage: ((data: any) => void) | null = null;
  public onConnectionStateChange: ((state: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTION_VERIFIED' | 'ERROR', errorMsg?: string) => void) | null = null;
  // Specific LAN callback for peer joined/left events
  public onPeerJoined: ((deviceId: string) => void) | null = null;
  public onPeerLeft: ((deviceId: string) => void) | null = null;
  
  private messageListener: PluginListenerHandle | null = null;
  private stateListener: PluginListenerHandle | null = null;
  private peerJoinedListener: PluginListenerHandle | null = null;
  private peerLeftListener: PluginListenerHandle | null = null;

  async connect(config: GameServiceConfig): Promise<void> {
    const { role, ip, port = appConfig.LAN_PORT } = config;
    
    await this.setupListeners();

    try {
      if (role === 'HOST') {
        console.log(`[LAN] Starting local server on port ${port}...`);
        await LocalServer.startServer({ port });
        // Host waits for peers, UI moves to waiting state outside.
        this.notifyState('CONNECTED'); 
      } else if (role === 'CLIENT' && ip) {
        console.log(`[LAN] Connecting to local server ${ip}:${port}...`);
        await LocalServer.connectToServer({ ip, port });
        // For LAN client, we wait for 'CONNECTED' event then send ROOM_READY
      } else {
        throw new Error('Invalid LAN configuration');
      }
    } catch (e) {
      console.error('[LAN] Setup failed:', e);
      this.notifyState('ERROR', role === 'HOST' ? 'فشل إنشاء الغرفة' : 'فشل الاتصال بالسيرفر');
      throw e;
    }
  }

  sendMessage(action: GameAction): void {
    try {
      LocalServer.sendMessage({ message: JSON.stringify(action) }).catch(e => {
        console.error('[LAN] Failed to send message:', e);
      });
    } catch (e) {
      console.error('[LAN] Failed to send message:', e);
    }
  }

  async disconnect(): Promise<void> {
    try {
      console.log('[LAN] Stopping local server / disconnecting');
      await LocalServer.stopAll(); 
      this.notifyState('DISCONNECTED');
    } catch (e) {
      console.error('[LAN] Failed to disconnect:', e);
    }
  }

  cleanup(): void {
    if (this.messageListener) this.messageListener.remove();
    if (this.stateListener) this.stateListener.remove();
    if (this.peerJoinedListener) this.peerJoinedListener.remove();
    if (this.peerLeftListener) this.peerLeftListener.remove();

    this.messageListener = null;
    this.stateListener = null;
    this.peerJoinedListener = null;
    this.peerLeftListener = null;

    this.onMessage = null;
    this.onConnectionStateChange = null;
    this.onPeerJoined = null;
    this.onPeerLeft = null;
  }

  private async setupListeners() {
    this.cleanup();

    this.messageListener = await LocalServer.addListener('onMessageReceived', (info: any) => {
      try {
        const payload = typeof info.message === 'string' ? JSON.parse(info.message) : info.message;
        if (this.onMessage) this.onMessage(payload);
      } catch (err) {
        console.warn(`[LAN] Non-JSON message:`, info.message);
      }
    });

    this.stateListener = await LocalServer.addListener('onStatusUpdate', (info: any) => {
      const state = info.status;
      console.log(`[LAN] Connection state changed: ${state}`);
      
      switch (state) {
        case 'CONNECTED':
          // In App.tsx, when client connects, we immediately sent ROOM_READY. 
          // We can handle this logic directly here or emit to App to handle.
          this.notifyState('CONNECTED');
          setTimeout(() => {
            this.sendMessage({ type: 'ROOM_READY', deviceId: 'dummy' });
          }, 100);
          break;
        case 'DISCONNECTED':
          this.notifyState('DISCONNECTED', 'تم قطع الاتصال بالسيرفر');
          break;
      }
    });

    this.peerJoinedListener = await LocalServer.addListener('onPeerJoined', (info: any) => {
      console.log(`[LAN] Peer joined: ${info.deviceId}`);
      if (this.onPeerJoined) this.onPeerJoined(info.deviceId);
    });

    this.peerLeftListener = await LocalServer.addListener('onPeerLeft', (info: any) => {
      console.log(`[LAN] Peer left: ${info.deviceId}`);
      if (this.onPeerLeft) this.onPeerLeft(info.deviceId);
    });
  }

  private notifyState(state: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTION_VERIFIED' | 'ERROR', errorMsg?: string) {
    if (this.onConnectionStateChange) {
      this.onConnectionStateChange(state, errorMsg);
    }
  }
}
