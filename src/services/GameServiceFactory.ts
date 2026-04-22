import { IGameService, GameServiceConfig } from './IGameService';
import { OnlineGameService_Web } from './OnlineGameService_Web';
import { OnlineGameService_AndroidNative } from './OnlineGameService_AndroidNative';
import { LANGameService_AndroidNative } from './LANGameService_AndroidNative';
import { isMobilePlatform } from '../lib/platform';

export class GameServiceFactory {
  static createOnlineService(): IGameService {
    if (isMobilePlatform()) {
      return new OnlineGameService_AndroidNative();
    } else {
      return new OnlineGameService_Web();
    }
  }

  static createLANService(): IGameService {
    if (isMobilePlatform()) {
      return new LANGameService_AndroidNative();
    } else {
      console.warn("LAN game is not supported on the Web platform. Falling back to dummy service.");
      // Could return a dummy service or throw an error. For now, returning a basic dummy implementation.
      return {
         connect: async () => {},
         sendMessage: () => {},
         disconnect: async () => {},
         cleanup: () => {},
         onMessage: null,
         onConnectionStateChange: null
      };
    }
  }
}
