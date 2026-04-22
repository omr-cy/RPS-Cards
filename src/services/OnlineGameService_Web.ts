import { IGameService, GameServiceConfig, GameAction } from './IGameService';
import appConfig from '../config.json';

export class OnlineGameService_Web implements IGameService {
  private ws: WebSocket | null = null;
  private connectionTimeout: any = null;
  public onMessage: ((data: any) => void) | null = null;
  public onConnectionStateChange: ((state: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTION_VERIFIED' | 'ERROR', errorMsg?: string) => void) | null = null;

  async connect(config: GameServiceConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const vBack = import.meta.env.VITE_BACKEND_URL;
      const serverUrl = vBack || appConfig.ONLINE_SERVER_URL;
      
      console.log(`[Web Online] Connecting to ${serverUrl}`);

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        if (config.initialAction) this.ws.send(JSON.stringify(config.initialAction));
        resolve();
        return;
      }

      this.ws = new WebSocket(serverUrl);

      this.connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          this.ws.close();
          this.notifyState('ERROR', 'انتهت مهلة المزامنة - تأكد من تشغيل السيرفر');
          reject(new Error('Timeout'));
        }
      }, 5000);

      this.ws.onopen = () => {
        clearTimeout(this.connectionTimeout);
        console.log('[Web Online] Connected');
        this.notifyState('CONNECTION_VERIFIED');
        if (config.initialAction) this.ws?.send(JSON.stringify(config.initialAction));
        resolve();
      };

      this.ws.onerror = (e) => {
        console.error('[Web Online] WebSocket error:', e);
        this.notifyState('ERROR', 'فشل الاتصال بسيرفر اللعب عبر الإنترنت');
        reject(e);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'PING') {
            this.ws?.send(JSON.stringify({ type: 'PONG' }));
            return;
          }
          if (this.onMessage) this.onMessage(data);
        } catch (err) {
          console.log(`[Web Online] Received non-JSON message: ${event.data}`);
        }
      };

      this.ws.onclose = () => {
        console.log('[Web Online] Disconnected');
        this.notifyState('DISCONNECTED');
        this.ws = null;
      };
    });
  }

  sendMessage(action: GameAction): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(action));
    } else {
      console.warn('[Web Online] Cannot send action, socket not open:', action);
    }
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.notifyState('DISCONNECTED');
  }

  cleanup(): void {
    if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
    this.disconnect();
    this.onMessage = null;
    this.onConnectionStateChange = null;
  }

  private notifyState(state: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTION_VERIFIED' | 'ERROR', errorMsg?: string) {
    if (this.onConnectionStateChange) {
      this.onConnectionStateChange(state, errorMsg);
    }
  }
}
