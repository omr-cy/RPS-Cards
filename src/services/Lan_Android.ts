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

  hostGame: async (playerName: string, addLog: Function, setErrorMsg: Function) => {
    addLog('Host button clicked', 'info');
    if (!playerName.trim()) {
      setErrorMsg('يرجى إدخال اسمك أولاً');
      return false;
    }
    if (Capacitor.getPlatform() === 'web') {
      setErrorMsg('ميزة الاستضافة متاحة فقط في تطبيق الأندرويد');
      return false;
    }
    try {
      await LocalServer.startServer({ port: config.LAN_PORT });
      return true;
      // Native will send ROOM_READY when server is started
    } catch (e) {
      addLog(`Host failed: ${e}`, 'error');
      setErrorMsg('فشل بدء السيرفر');
      return false;
    }
  },

  joinGame: async (ipInput: string, addLog: Function, setErrorMsg: Function) => {
    if (!LanAndroidService.isValidIp(ipInput.trim())) {
      setErrorMsg('يرجى إدخال عنوان IP صحيح');
      return false;
    }
    if (Capacitor.getPlatform() === 'web') {
      setErrorMsg('ميزة الانضمام متاحة فقط في تطبيق الأندرويد');
      return false;
    }
    try {
      await LocalServer.connectToServer({ ip: ipInput.trim(), port: config.LAN_PORT });
      return true;
      // Native will send ROOM_READY after handshake is verified
    } catch (e) {
      addLog(`Join failed: ${e}`, 'error');
      setErrorMsg('فشل الاتصال بالسيرفر');
      return false;
    }
  }
};
