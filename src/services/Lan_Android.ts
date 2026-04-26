import { Capacitor } from '@capacitor/core';
import config from '../config.json';
import { LocalServer } from '../App';

export const LanAndroidService = {
  isValidIp: (ip: string) => {
    return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip);
  },

  handleIpChange: (value: string) => {
    // Convert Arabic numerals to English numerals
    let sanitized = value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
    // Remove any character that is not a digit or a dot
    sanitized = sanitized.replace(/[^0-9.]/g, '').slice(0, 15);
    return sanitized;
  },

  hostGame: async (playerName: string, addLog: Function, setErrorMsg: Function, t: Function) => {
    addLog('Host button clicked', 'info');
    if (!playerName.trim()) {
      setErrorMsg(t('error_enter_name'));
      return false;
    }
    if (Capacitor.getPlatform() === 'web') {
      setErrorMsg(t('error_android_only_host'));
      return false;
    }
    try {
      await LocalServer.startServer({ port: config.LAN_PORT });
      return true;
      // Native will send ROOM_READY when server is started
    } catch (e) {
      addLog(`Host failed: ${e}`, 'error');
      setErrorMsg(t('error_start_server_fail'));
      return false;
    }
  },

  joinGame: async (ipInput: string, addLog: Function, setErrorMsg: Function, t: Function) => {
    if (!LanAndroidService.isValidIp(ipInput.trim())) {
      setErrorMsg(t('error_invalid_ip'));
      return false;
    }
    if (Capacitor.getPlatform() === 'web') {
      setErrorMsg(t('error_android_only_join'));
      return false;
    }
    try {
      await LocalServer.connectToServer({ ip: ipInput.trim(), port: config.LAN_PORT });
      return true;
      // Native will send ROOM_READY after handshake is verified
    } catch (e) {
      addLog(`Join failed: ${e}`, 'error');
      setErrorMsg(t('error_connect_server_fail'));
      return false;
    }
  }
};
