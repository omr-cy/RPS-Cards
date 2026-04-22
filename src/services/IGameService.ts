export type GameAction = any;

export interface GameServiceConfig {
  url?: string; // For online web
  ip?: string; // For LAN
  port?: number; // For LAN
  isOnline?: boolean; // For native online
  role?: 'HOST' | 'CLIENT'; // For LAN
  initialAction?: any; // Action to send upon connect
}

export interface IGameService {
  connect(config: GameServiceConfig): Promise<void>;
  sendMessage(action: GameAction): void;
  disconnect(): Promise<void>;
  onMessage: ((data: any) => void) | null;
  onConnectionStateChange: ((state: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTION_VERIFIED' | 'ERROR', errorMsg?: string) => void) | null;
  cleanup(): void;
}
