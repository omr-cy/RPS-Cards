import React, { useState, useEffect, useRef } from 'react';
import { Users, Diamond, ArrowLeft, ArrowRight, Activity, LogOut } from 'lucide-react';
import { IoMdSend } from 'react-icons/io';
import { getApiUrl } from '../env_config';

const API_BASE_URL = getApiUrl();

export const GroupChatTab = ({ groupId, user, ws, groupChatMessages, setGroupChatMessages, connectToOnline }: any) => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/groups/${groupId}/chat`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setGroupChatMessages(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Only attempt to connect once if there's no ws connection when the component mounts
    if (!ws || (ws.readyState !== 1 && ws.readyState !== 0)) { // 1 is OPEN, 0 is CONNECTING
      connectToOnline().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupChatMessages]);

  const sendMsg = async () => {
    if (!inputText.trim()) return;
    const txt = inputText.trim();
    setInputText('');
    
    try {
      await fetch(`${API_BASE_URL}/api/groups/${groupId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id, text: txt })
      });
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col h-full relative">
       {loading && (
         <div className="absolute inset-0 z-10 flex items-center justify-center bg-game-dark/50 backdrop-blur-sm">
           <Activity className="w-8 h-8 text-game-teal animate-spin" />
         </div>
       )}
       <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar smooth-scroll">
          {groupChatMessages.length === 0 && !loading && (
             <div className="text-center text-game-offwhite/50 text-xs mt-10">كن أول من يتحدث في الفريق!</div>
          )}
          {groupChatMessages.map((msg: any, idx: number) => {
            const isMe = msg.senderId?._id === user?._id || msg.senderId === user?._id;
            const senderName = isMe ? 'أنت' : (msg.senderId?.displayName || 'لاعب');
            return (
              <div key={msg._id || idx} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                 <div className={`max-w-[70%] rounded-2xl px-4 py-2 flex flex-col shadow-md ${isMe ? 'bg-game-teal/20 border border-game-teal/30 text-game-offwhite rounded-tr-sm' : 'bg-white/10 border border-white/5 text-game-offwhite rounded-tl-sm'}`}>
                    <span className="text-[10px] text-game-teal font-display mb-1">{senderName}</span>
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
              placeholder="شات الفريق..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-game-offwhite placeholder:text-white/20 focus:outline-none focus:border-game-teal/50"
            />
            <button 
              onClick={sendMsg}
              disabled={!inputText.trim()}
              className="bg-game-teal text-game-dark px-4 rounded-xl flex items-center justify-center disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-game-teal/20"
            >
              {/* @ts-ignore */}
              <IoMdSend className="w-5 h-5 -rotate-90" />
            </button>
          </div>
       </div>
    </div>
  );
};

export const GroupsTabContent = ({ user, ws, groupChatMessages, setGroupChatMessages, connectToOnline, setCoins }: any) => {
  const [view, setView] = useState<'list' | 'create' | 'myGroup'>('list');
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myGroupData, setMyGroupData] = useState<any>(null);
  
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [isErr, setIsErr] = useState('');

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/groups`);
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
      
      if (user?.groupId) {
         fetchMyGroup();
      } else {
         setView('list');
      }
    } catch(e) { }
    setLoading(false);
  };

  const fetchMyGroup = async () => {
    if (!user?.groupId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/groups/${user.groupId}`);
      const data = await res.json();
      if (data && !data.error) {
        setMyGroupData(data);
        setView('myGroup');
      } else {
        setView('list');
      }
    } catch (e) {
      setView('list');
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [user]);

  const joinGroup = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/groups/${id}/join`, {
        method: 'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ userId: user._id })
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else {
        user.groupId = id; 
        fetchMyGroup();
      }
    }catch(e){}
  };

  const createGroup = async () => {
    if (!name.trim()) return setIsErr('اكتب اسم الفريق');
    setIsErr('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/groups/create`, {
        method: 'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          userId: user._id,
          name: name.trim(),
          description: desc.trim()
        })
      });
      const data = await res.json();
      if (data.error) setIsErr(data.error);
      else {
        setCoins((prev: number) => Math.max(0, prev - 1000));
        user.groupId = data._id;
        fetchMyGroup();
      }
    } catch(e) { setIsErr('حدث خطأ'); }
  };

  const leaveGroup = async () => {
    if (!window.confirm('هل أنت متأكد من الخروج من الفريق؟')) return;
    try {
      await fetch(`${API_BASE_URL}/api/groups/${user.groupId}/leave`, {
        method: 'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ userId: user._id })
      });
      user.groupId = null;
      setMyGroupData(null);
      fetchGroups();
    } catch(e) { }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Activity className="w-8 h-8 text-game-teal animate-spin" /></div>;

  if (view === 'myGroup' && myGroupData) {
     return (
       <div className="flex-1 w-full flex flex-col h-full bg-slate-900/40 relative">
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
             <div className="flex items-center gap-2">
               <Users className="w-5 h-5 text-game-teal" />
               <h3 className="font-display text-lg text-white">{myGroupData.name}</h3>
             </div>
             <button onClick={leaveGroup} className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 font-display transition-colors bg-red-400/10 px-3 py-1.5 rounded-lg active:scale-95">
                <LogOut className="w-3.5 h-3.5" /> خروج
             </button>
          </div>
          <GroupChatTab 
             groupId={myGroupData._id} 
             user={user} 
             ws={ws} 
             groupChatMessages={groupChatMessages} 
             setGroupChatMessages={setGroupChatMessages} 
             connectToOnline={connectToOnline} 
          />
       </div>
     )
  }

  if (view === 'create') {
    return (
      <div className="flex-1 w-full max-w-md mx-auto flex flex-col p-6 space-y-6 overflow-y-auto">
        <div className="flex items-center gap-3">
           <button onClick={() => setView('list')} className="text-white/50 active:scale-90 p-2"><ArrowRight className="w-5 h-5" /></button>
           <h3 className="font-display text-xl text-white">إنشاء فريق جديد</h3>
        </div>

        <div className="bg-game-dark/50 p-6 border border-white/10 rounded-2xl space-y-5 shadow-xl">
           {isErr && <div className="bg-red-500/20 text-red-300 p-3 rounded-lg text-xs font-display text-center">{isErr}</div>}
           <div className="space-y-1">
             <label className="text-xs text-game-offwhite/50 font-display">اسم الفريق</label>
             <input type="text" maxLength={20} value={name} onChange={e=>setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-game-offwhite focus:border-game-teal" placeholder="اسم مميز..." />
           </div>
           <div className="space-y-1">
             <label className="text-xs text-game-offwhite/50 font-display">وصف الفريق (اختياري)</label>
             <input type="text" maxLength={100} value={desc} onChange={e=>setDesc(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-game-offwhite focus:border-game-teal" placeholder="أفضل اللاعبين العرب..." />
           </div>
           
           <button onClick={createGroup} className="w-full py-4 bg-game-teal text-game-dark rounded-xl font-display text-base active:scale-95 transition-all shadow-lg shadow-game-teal/20 mt-4">إنشاء فريق</button>
           <p className="text-center text-xs text-game-offwhite/50 mt-3 font-display">
             ستكون التكلفة 1000 عملة
           </p>
        </div>
      </div>
    );
  }

  // list view
  return (
    <div className="flex-1 w-full max-w-md mx-auto flex flex-col p-4 space-y-4 overflow-y-auto">
      <button onClick={() => setView('create')} className="w-full p-4 border-2 border-dashed border-game-teal/30 hover:border-game-teal rounded-xl bg-game-teal/5 flex items-center justify-center gap-2 text-game-teal font-display transition-all active:scale-95">
         إنشاء فريق خاص بمقابل ذهب <Diamond className="w-4 h-4 text-yellow-500 mr-2" />
      </button>

      <div className="space-y-3 pt-4">
         <h4 className="font-display text-white text-sm px-2 opacity-80">أفضل الفرق العالمية</h4>
         {groups.length === 0 && <div className="text-center text-game-offwhite/50 text-xs mt-10">لا توجد فرق حالياً</div>}
         {groups.map(g => (
           <div key={g._id} className="bg-white/5 border border-white/5 hover:border-game-teal/30 rounded-xl p-4 flex flex-col gap-3 transition-colors group">
              <div className="flex items-start justify-between">
                 <div>
                    <h3 className="text-lg font-display text-white group-hover:text-game-teal transition-colors">{g.name}</h3>
                    {g.description && <p className="text-xs text-game-offwhite/50 mt-1 max-w-[200px] truncate">{g.description}</p>}
                 </div>
                 <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-game-teal font-display bg-game-teal/10 px-2 py-0.5 rounded-full flex items-center gap-1"><Activity className="w-3 h-3 rotate-90" /> {g.score}</span>
                    <span className="text-[10px] text-emerald-400 font-display">{g.members?.length}/{g.maxMembers}</span>
                 </div>
              </div>
              <button 
                onClick={() => joinGroup(g._id)}
                className="w-full py-2 bg-white/5 text-game-offwhite rounded-lg font-display text-sm active:scale-95 group-hover:bg-game-teal group-hover:text-game-dark transition-all"
              >
                 طلب إنضمام
              </button>
           </div>
         ))}
      </div>
    </div>
  )
}
