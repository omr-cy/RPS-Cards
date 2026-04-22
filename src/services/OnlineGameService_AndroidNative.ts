import { IGameService, GameServiceConfig, GameAction } from './IGameService';
import appConfig from '../config.json';
import { PluginListenerHandle } from '@capacitor/core';
import { LocalServer } from '../lib/cap-net-server'; 

export class OnlineGameService_AndroidNative implements IGameService {
  public onMessage: ((data: any) => void) | null = null;
  public onConnectionStateChange: ((state: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTION_VERIFIED' | 'ERROR', errorMsg?: string) => void) | null = null;
  
  private messageListener: PluginListenerHandle | null = null;
  private stateListener: PluginListenerHandle | null = null;

  async connect(config: GameServiceConfig): Promise<void> {
    const serverUrl = import.meta.env.VITE_BACKEND_URL || appConfig.ONLINE_SERVER_URL;
    
    console.log(`[Native Online] Connecting to ${serverUrl}`);
    
    // We register our own events. Note: We must be careful to clean these up so they don't leak or duplicate.
    await this.setupListeners();

    try {
      await LocalServer.connectToServer({ url: serverUrl, isOnline: true });
      // The Native plugin will attempt to connect.
      // Connection success/fail is usually handled via 'onConnectionStateChanged', 
      // but if the method throws immediately, we catch it here.
      if (config.initialAction) {
        // Send initial action.
        await this.sendMessage(config.initialAction);
      }
    } catch (e) {
      console.error('[Native Online] Connection failed:', e);
      this.notifyState('ERROR', 'فشل الاتصال عبر النيتف');
      throw e;
    }
  }

  sendMessage(action: GameAction): void {
    try {
      LocalServer.sendMessage({ message: JSON.stringify(action) }).catch(e => {
        console.error('[Native Online] Failed to send message:', e);
      });
    } catch (e) {
      console.error('[Native Online] Failed to send message:', e);
    }
  }

  async disconnect(): Promise<void> {
    try {
      // For Native online connections, we stop the connection gracefully. 
      // Since `LocalServer` handles both LAN and Online natively, stopping all clears connections.
      // You may need to just trigger a socket close natively.
      console.log('[Native Online] Stopping native socket connection');
      await LocalServer.stopAll(); 
      this.notifyState('DISCONNECTED');
    } catch (e) {
      console.error('[Native Online] Failed to disconnect:', e);
    }
  }

  cleanup(): void {
    if (this.messageListener) {
      this.messageListener.remove();
      this.messageListener = null;
    }
    if (this.stateListener) {
      this.stateListener.remove();
      this.stateListener = null;
    }
    this.onMessage = null;
    this.onConnectionStateChange = null;
  }

  private async setupListeners() {
    this.cleanup(); // Remove duplicates just in case

    this.messageListener = await LocalServer.addListener('onMessageReceived', (info: any) => {
      try {
        const payload = typeof info.message === 'string' ? JSON.parse(info.message) : info.message;
        if (this.onMessage) this.onMessage(payload);
      } catch (err) {
        console.warn(`[Native Online] Non-JSON message:`, info.message);
      }
    });

    this.stateListener = await LocalServer.addListener('onStatusUpdate', (info: any) => {
      const state = info.status;
      console.log(`[Native Online] Connection state changed: ${state}`);
      switch (state) {
        case 'CONNECTED':
          // The native socket usually sends 'CONNECTED', but in App.tsx it treats this as 'CONNECTION_VERIFIED'
          this.notifyState('CONNECTION_VERIFIED');
          break;
        case 'DISCONNECTED':
          this.notifyState('DISCONNECTED');
          break;
      }
    });
  }

  private notifyState(state: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTION_VERIFIED' | 'ERROR', errorMsg?: string) {
    if (this.onConnectionStateChange) {
      this.onConnectionStateChange(state, errorMsg);
    }
  }
}
