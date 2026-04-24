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

      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        if (ws.readyState === WebSocket.OPEN) {
           if (action) ws.send(JSON.stringify(action));
           resolve(ws);
        } else {
           // Wait for open
           const checkReady = setInterval(() => {
              if (ws.readyState === WebSocket.OPEN) {
                 clearInterval(checkReady);
                 if (action) ws.send(JSON.stringify(action));
                 resolve(ws);
              } else if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
                 clearInterval(checkReady);
                 reject(new Error('WebSocket closed while waiting'));
              }
           }, 100);
        }
        return;
      }
      
      addLog(`Connecting to online server: ${serverUrl}`, 'info');
      const socket = new WebSocket(serverUrl);
      setWs(socket); // Immediately set so subsequent calls know we are connecting
      
      const timeout = setTimeout(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          socket.close();
          addLog('Connection timeout', 'error');
          setErrorMsg('انتهت مهلة المزامنة - تأكد من تشغيل السيرفر');
          reject(new Error('Timeout'));
        }
      }, 15000);

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
      setMatchmakingOpponent: Function;
      setShowMatchmakingResult: Function;
      setIsWaitingInPrivateRoom: Function;
      roleRef: any;
      setMatchmakingCanCancel: Function;
    }
  ) => {
    const { 
      setIsSearching, setRole, setRoomId, setAppState, 
      setRoomState, setErrorMsg, setShowLevelUp, refreshProfile, appStateRef,
      setMatchmakingOpponent, setShowMatchmakingResult,
      setIsWaitingInPrivateRoom, roleRef, setMatchmakingCanCancel
    } = options;

    if (data.type === 'matchmaking_status') {
      setIsSearching(true);
      setShowMatchmakingResult(false);
      setMatchmakingOpponent(null);
      setMatchmakingCanCancel(false);
      // Let the cancel button appear after 5 seconds
      setTimeout(() => {
        setMatchmakingCanCancel(true);
      }, 5000);
    } else if (data.type === 'pong' || data.type === 'PONG' || data.type === 'HANDSHAKE_OK') {
      // do nothing here for the cancel button regarding matchmaking
    } else if (data.type === 'match_found' || data.type === 'joined_room_success' || data.type === 'room_created') {
      setRole('ONLINE');
      setRoomId(data.roomId);
      
      if (data.type === 'room_created') {
        setIsWaitingInPrivateRoom(true);
      }
      if (data.roomCode) setRoomId(data.roomCode);
      
      // If we are searching, we wait for room_state to show the opponent
      if (data.type === 'match_found' || data.type === 'room_created') {
        // Keep searching/menu state true till room_state arrival
        setIsSearching(data.type === 'match_found');
      } else {
        setIsSearching(false);
        setAppState('inRoom');
      }
    } else if (data.type === 'room_state') {
      setRoomState(data.state);
      setRoomId(data.state.id);
      setIsWaitingInPrivateRoom(false);
      
      // If we were in matchmaking, show the result first
      const isActuallySearching = appStateRef.current === 'menu' && (data.state.players && Object.keys(data.state.players).length === 2);
      
      if (isActuallySearching) {
        // Find opponent info
        const meId = localStorage.getItem('cardclash_playerId');
        const players = data.state.players;
        const opponentId = Object.keys(players).find(id => id !== meId);
        if (opponentId) {
          const opponent = players[opponentId];
          setMatchmakingOpponent(opponent);
          setShowMatchmakingResult(true);
          
          // Wait 2 seconds before entering
          setTimeout(() => {
            if (roleRef.current === 'NONE') return; // User cancelled
            setIsSearching(false);
            setShowMatchmakingResult(false);
            setAppState('inRoom');
          }, 2000);
        } else {
          setAppState('inRoom');
          setIsSearching(false);
        }
      } else {
        if (appStateRef.current !== 'inRoom') setAppState('inRoom');
      }
    } else if (data.type === 'error_msg') {
      setErrorMsg(data.msg);
      setIsSearching(false);
    } else if (data.type === 'level_up') {
      setShowLevelUp(data.newLevel);
      refreshProfile();
    }
  }
};
