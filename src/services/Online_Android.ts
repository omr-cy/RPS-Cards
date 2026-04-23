import { Capacitor } from '@capacitor/core';
import { getSocketUrl } from '../env_config';
import { LocalServer } from '../App';

export const OnlineAndroidService = {
  connectToOnline: (
    options: {
      action?: any;
      ws: any;
      setWs: Function;
      addLog: Function;
      setErrorMsg: Function;
      setConnectionStatus: Function;
      setIsSearching: Function;
      handleOnlineMessage: Function;
      onlineActionRef: any;
      appStateRef: any;
      roleRef: any;
      setAppState: Function;
      setRoomId: Function;
      setRoomState: Function;
      setRole: Function;
    }
  ): Promise<WebSocket | void> => {
    const { 
      action, ws, setWs, addLog, setErrorMsg, setConnectionStatus, 
      setIsSearching, handleOnlineMessage, onlineActionRef, 
      appStateRef, roleRef, setAppState, setRoomId, setRoomState, setRole 
    } = options;

    return new Promise(async (resolve, reject) => {
      const serverUrl = getSocketUrl();
      
      if (Capacitor.isNativePlatform()) {
        try {
          addLog(`Connecting NATIVELY to online server: ${serverUrl}`, 'info');
          if (action) onlineActionRef.current = action;
          await LocalServer.connectToServer({ url: serverUrl, isOnline: true });
          resolve();
        } catch (e) {
          addLog(`Native online connection failed: ${e}`, 'error');
          setErrorMsg('فشل الاتصال عبر النيتف');
          reject(e);
        }
        return;
      }

      if (ws && ws.readyState === WebSocket.OPEN) {
        if (action) ws.send(JSON.stringify(action));
        resolve(ws);
        return;
      }
      
      addLog(`Connecting to online server: ${serverUrl}`, 'info');
      const socket = new WebSocket(serverUrl);
      
      const timeout = setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          socket.close();
          addLog('Connection timeout', 'error');
          setErrorMsg('انتهت مهلة المزامنة - تأكد من تشغيل السيرفر');
          reject(new Error('Timeout'));
        }
      }, 5000);

      socket.onopen = () => {
        clearTimeout(timeout);
        addLog('Connected to Cloud Server', 'success');
        setWs(socket);
        setConnectionStatus('CONNECTION_VERIFIED');
        if (action) socket.send(JSON.stringify(action));
        resolve(socket);
      };
      
      socket.onerror = (e) => {
        addLog(`WebSocket error: ${JSON.stringify(e)}`, 'error');
        setErrorMsg('فشل الاتصال بسيرفر اللعب عبر الإنترنت');
        reject(e);
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'PING') {
            socket.send(JSON.stringify({ type: 'PONG' }));
            return;
          }
          handleOnlineMessage(data);
        } catch(err) {
          addLog(`Received non-JSON message: ${event.data}`, 'info');
        }
      };
      
      socket.onclose = () => {
        addLog('Disconnected from Cloud Server', 'info');
        setWs(null);
        setConnectionStatus('DISCONNECTED');
        setIsSearching(false);
        if (appStateRef.current === 'inRoom' && roleRef.current === 'ONLINE') {
          setAppState('menu');
          setRoomId(null);
          setRoomState(null);
          setRole('NONE');
          setErrorMsg('تم قطع الاتصال بالسيرفر');
        }
      };
    });
  },

  handleOnlineMessage: (
    data: any,
    options: {
      setIsSearching: Function;
      setRole: Function;
      setRoomId: Function;
      setAppState: Function;
      setRoomState: Function;
      setErrorMsg: Function;
      setShowLevelUp: Function;
      refreshProfile: Function;
      appStateRef: any;
    }
  ) => {
    const { 
      setIsSearching, setRole, setRoomId, setAppState, 
      setRoomState, setErrorMsg, setShowLevelUp, refreshProfile, appStateRef 
    } = options;

    if (data.type === 'matchmaking_status') {
      setIsSearching(true);
    } else if (data.type === 'match_found' || data.type === 'joined_room_success' || data.type === 'room_created') {
      setIsSearching(false);
      setRole('ONLINE');
      setRoomId(data.roomId);
      if (data.roomCode) setRoomId(data.roomCode);
      setAppState('inRoom');
    } else if (data.type === 'room_state') {
      setRoomState(data.state);
      setRoomId(data.state.id);
      if (appStateRef.current !== 'inRoom') setAppState('inRoom');
    } else if (data.type === 'error_msg') {
      setErrorMsg(data.msg);
      setIsSearching(false);
    } else if (data.type === 'level_up') {
      setShowLevelUp(data.newLevel);
      refreshProfile();
    }
  }
};
