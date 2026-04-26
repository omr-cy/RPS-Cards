import React, { useState, useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';
import { IoMdSend } from 'react-icons/io';
import { getApiUrl } from '../../env_config';
import { useLanguage } from '../../contexts/LanguageContext';

export const GlobalChat = ({ ws, chatMessages, setChatMessages, user, connectToOnline, sendAction, isOnlineConnected }: any) => {
  const { t } = useLanguage();
  const [inputText, setInputText] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);

  useEffect(() => {
    if (!isOnlineConnected) {
      setConnecting(true);
      connectToOnline({ type: 'get_chat_history' })
        .catch(() => {})
        .finally(() => {
          setConnecting(false);
          setHasMore(true);
        });
    } else {
      sendAction({ type: 'get_chat_history' });
      setHasMore(true);
    }
  }, [isOnlineConnected]);

  useEffect(() => {
    if (shouldScrollToBottom) {
       bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, shouldScrollToBottom]);

  const loadMore = async () => {
    if (loadingMore || !hasMore || chatMessages.length === 0) return;
    
    setLoadingMore(true);
    setShouldScrollToBottom(false);
    
    try {
      const oldestMsg = chatMessages[0];
      const before = oldestMsg.timestamp;
      
      const response = await fetch(`${getApiUrl()}/api/chat/history?before=${new Date(before).toISOString()}`);
      const olderMessages = await response.json();
      
      if (olderMessages.length < 10) {
        setHasMore(false);
      }
      
      if (olderMessages.length > 0) {
        // Remember previous scroll height to maintain position
        const container = scrollContainerRef.current;
        const prevHeight = container?.scrollHeight || 0;
        
        setChatMessages((prev: any[]) => [...olderMessages, ...prev]);
        
        // After state update, adjust scroll
        setTimeout(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - prevHeight;
          }
        }, 0);
      }
    } catch (e) {
      console.error('Failed to load more messages:', e);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    // If at top or near top, load more
    if (target.scrollTop < 50) {
      loadMore();
    }
    
    // Detect if user is at bottom to auto-scroll on new messages
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
    setShouldScrollToBottom(isAtBottom);
  };

  const sendMsg = () => {
    if (!inputText.trim() || !isOnlineConnected) return;
    setShouldScrollToBottom(true);
    sendAction({
      type: 'send_chat_message',
      text: inputText.trim(),
      senderName: user?.displayName || t('player_default_name')
    });
    setInputText('');
  };

  return (
    <div className="flex-1 w-full flex flex-col h-full bg-[#0a0a0a]/40 relative">
       {connecting && (
         <div className="absolute inset-0 z-10 flex items-center justify-center bg-game-dark/50 backdrop-blur-sm">
           <Activity className="w-8 h-8 text-game-primary animate-spin" />
         </div>
       )}
       <div 
         ref={scrollContainerRef}
         onScroll={handleScroll}
         className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar smooth-scroll"
       >
          {hasMore && chatMessages.length >= 10 && (
            <div className="flex justify-center py-2">
              {loadingMore ? (
                <Activity className="w-4 h-4 text-game-primary animate-spin" />
              ) : (
                <span className="text-[10px] text-game-offwhite/30">{t('chat_load_more')}</span>
              )}
            </div>
          )}
          {chatMessages.length === 0 && !connecting && (
             <div className="text-center text-game-offwhite/50 text-xs mt-10">{t('chat_no_messages')}</div>
          )}
          {chatMessages.map((msg: any, idx: number) => {
            const isMe = msg.senderId === user?._id || msg.senderName === user?.displayName;
            return (
              <div key={msg.id || idx} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                 <div className={`max-w-[70%] rounded-2xl px-4 py-2 flex flex-col shadow-md ${isMe ? 'bg-game-primary/20 border border-game-primary/30 text-game-offwhite rounded-tr-sm' : 'bg-white/10 border border-white/5 text-game-offwhite rounded-tl-sm'}`}>
                    <span className="text-[10px] text-game-primary font-display mb-1">{isMe ? t('chat_you') : msg.senderName}</span>
                    <p className="text-sm font-body break-words whitespace-pre-wrap">{msg.text}</p>
                 </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
       </div>
       <div className="p-3 border-t border-white/10 bg-game-dark/80 backdrop-blur-md pb-safe">
          <div className="flex gap-2 max-w-md mx-auto relative">
            <input 
              type="text" 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMsg()}
              placeholder={t('chat_placeholder')}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-game-offwhite placeholder:text-white/20 focus:outline-none focus:border-game-primary/50"
            />
            <button 
              onClick={sendMsg}
              disabled={!inputText.trim()}
              className="bg-game-primary text-game-dark px-4 rounded-xl flex items-center justify-center disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-game-primary/20"
            >
              {/* @ts-ignore */}
              <IoMdSend className="w-5 h-5 -rotate-90" />
            </button>
          </div>
       </div>
    </div>
  );
};
