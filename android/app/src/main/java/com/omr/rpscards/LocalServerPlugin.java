package com.omr.rpscards;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.java_websocket.WebSocket;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.handshake.ServerHandshake;
import org.java_websocket.server.WebSocketServer;
import org.json.JSONException;
import org.json.JSONObject;

import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.net.URI;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "LocalServer")
public class LocalServerPlugin extends Plugin {

    private GameWebSocketServer server;
    private GameWebSocketClient client;
    private String role = "NONE"; // HOST, CLIENT, NONE
    private String connectionStatus = "DISCONNECTED"; // DISCONNECTED, CONNECTING, SERVER_STARTED, CONNECTION_VERIFIED
    private List<WebSocket> connectedClients = new ArrayList<>();
    
    // Game Logic State (for HOST role)
    private JSONObject roomState;
    private java.util.Timer roundTimer;
    private final String INITIAL_DECK = "{\"rock\":3,\"paper\":3,\"scissors\":3}";

    @PluginMethod
    public void startServer(PluginCall call) {
        int port = call.getInt("port", 3000);
        
        try {
            stopAll();

            role = "HOST";
            connectionStatus = "SERVER_STARTED";
            connectedClients.clear();

            server = new GameWebSocketServer(new InetSocketAddress(port));
            server.setReuseAddr(true);
            server.start();
            
            logToReact("Server started on port " + port, "success");
            
            // For Host, SERVER_STARTED is enough to be "READY" to show lobby
            notifyRoomReady();
            
            JSObject ret = new JSObject();
            ret.put("status", "started");
            ret.put("port", port);
            call.resolve(ret);
            
            updateStatusToReact();
        } catch (Exception e) {
            logToReact("Failed to start server: " + e.getMessage(), "error");
            call.reject("Failed to start server", e);
        }
    }

    @PluginMethod
    public void connectToServer(PluginCall call) {
        String ip = call.getString("ip");
        String url = call.getString("url");
        int port = call.getInt("port", 3000);
        boolean isOnline = call.getBoolean("isOnline", false);
        
        if (ip == null && url == null) {
            call.reject("IP address or URL is required");
            return;
        }

        try {
            stopAll();

            role = isOnline ? "ONLINE" : "CLIENT";
            connectionStatus = "CONNECTING";

            URI uri;
            if (url != null && !url.isEmpty()) {
                uri = new URI(url);
            } else {
                uri = new URI("ws://" + ip + ":" + port);
            }

            client = new GameWebSocketClient(uri);
            client.connect();
            
            logToReact("Connecting to " + uri.toString() + "...", "info");
            
            call.resolve();
            updateStatusToReact();
        } catch (Exception e) {
            logToReact("Connection failed: " + e.getMessage(), "error");
            call.reject("Connection failed", e);
        }
    }

    private void notifyRoomReady() {
        try {
            JSONObject msg = new JSONObject();
            msg.put("type", "ROOM_READY");
            
            JSObject data = new JSObject();
            data.put("message", msg.toString());
            notifyListeners("onMessageReceived", data);
            logToReact("NATIVE -> REACT: ROOM_READY", "success");
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    private void notifyOnlineReady() {
        try {
            JSONObject msg = new JSONObject();
            msg.put("type", "ONLINE_READY");
            
            JSObject data = new JSObject();
            data.put("message", msg.toString());
            notifyListeners("onMessageReceived", data);
            logToReact("NATIVE -> REACT: ONLINE_READY", "success");
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    @PluginMethod
    public void stopAll(PluginCall call) {
        stopAll();
        call.resolve();
    }

    private void stopAll() {
        try {
            if (server != null) {
                server.stop();
                server = null;
            }
            if (client != null) {
                client.close();
                client = null;
            }
            role = "NONE";
            connectionStatus = "DISCONNECTED";
            connectedClients.clear();
            updateStatusToReact();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @PluginMethod
    public void sendMessage(PluginCall call) {
        String message = call.getString("message");
        if (message == null) {
            call.reject("Message is null");
            return;
        }

        if (role.equals("HOST") && server != null) {
            // Internal message from host React to native server logic
            try {
                JSONObject json = new JSONObject(message);
                server.handleHostGameLogic(null, json); // Pass null for conn to indicate it's the host
            } catch (JSONException e) {
                e.printStackTrace();
            }
            server.broadcast(message);
            call.resolve();
        } else if ((role.equals("CLIENT") || role.equals("ONLINE")) && client != null && client.isOpen()) {
            client.send(message);
            call.resolve();
        } else {
            call.reject("Not connected");
        }
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("role", role);
        ret.put("status", connectionStatus);
        ret.put("clientCount", connectedClients.size());
        ret.put("localIp", getLocalIpAddressInternal());
        call.resolve(ret);
    }

    @PluginMethod
    public void getLocalIpAddress(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("ip", getLocalIpAddressInternal());
        call.resolve(ret);
    }

    private String getLocalIpAddressInternal() {
        try {
            List<NetworkInterface> interfaces = Collections.list(NetworkInterface.getNetworkInterfaces());
            for (NetworkInterface intf : interfaces) {
                List<InetAddress> addrs = Collections.list(intf.getInetAddresses());
                for (InetAddress addr : addrs) {
                    if (!addr.isLoopbackAddress()) {
                        String sAddr = addr.getHostAddress();
                        boolean isIPv4 = sAddr.indexOf(':') < 0;
                        if (isIPv4) return sAddr;
                    }
                }
            }
        } catch (Exception ex) { ex.printStackTrace(); }
        return "0.0.0.0";
    }

    private void logToReact(String message, String type) {
        JSObject data = new JSObject();
        data.put("message", message);
        data.put("type", type);
        data.put("timestamp", System.currentTimeMillis());
        notifyListeners("onLog", data);
    }

    private void updateStatusToReact() {
        JSObject data = new JSObject();
        data.put("role", role);
        data.put("status", connectionStatus);
        data.put("clientCount", connectedClients.size());
        data.put("localIp", getLocalIpAddressInternal());
        notifyListeners("onStatusUpdate", data);
    }

    // Server Class
    private class GameWebSocketServer extends WebSocketServer {
        public GameWebSocketServer(InetSocketAddress address) { super(address); }

        @Override
        public void onOpen(WebSocket conn, ClientHandshake handshake) {
            connectedClients.add(conn);
            logToReact("Client connected: " + conn.getRemoteSocketAddress(), "success");
            
            // Start Handshake: Send PING
            try {
                JSONObject ping = new JSONObject();
                ping.put("type", "PING");
                conn.send(ping.toString());
            } catch (JSONException e) { e.printStackTrace(); }
            
            updateStatusToReact();
        }

        @Override
        public void onClose(WebSocket conn, int code, String reason, boolean remote) {
            connectedClients.remove(conn);
            logToReact("Client disconnected", "info");
            if (connectedClients.isEmpty()) {
                connectionStatus = "CONNECTING"; // Back to waiting
            }
            
            if (roomState != null) {
                try {
                    String socketId = conn.getRemoteSocketAddress().toString();
                    JSONObject players = roomState.getJSONObject("players");
                    if (players.has(socketId)) {
                        players.remove(socketId);
                        roomState.put("gameState", "waiting");
                        
                        JSONObject error = new JSONObject();
                        error.put("type", "error_msg");
                        error.put("msg", "الخصم غادر الغرفة");
                        server.broadcast(error.toString());
                        
                        JSObject data = new JSObject();
                        data.put("message", error.toString());
                        notifyListeners("onMessageReceived", data);
                        
                        broadcastRoomState();
                    }
                } catch (Exception e) { e.printStackTrace(); }
            }
            
            updateStatusToReact();
        }

        @Override
        public void onMessage(WebSocket conn, String message) {
            try {
                JSONObject json = new JSONObject(message);
                String type = json.optString("type");
                
                if (type.equals("PONG")) {
                    connectionStatus = "CONNECTION_VERIFIED";
                    logToReact("Handshake verified with client", "success");
                    updateStatusToReact();
                    try {
                        JSONObject ack = new JSONObject();
                        ack.put("type", "HANDSHAKE_OK");
                        conn.send(ack.toString());
                    } catch (JSONException e) { e.printStackTrace(); }
                    return;
                }

                if (role.equals("HOST")) {
                    handleHostGameLogic(conn, json);
                } else {
                    // If we are not host, we just forward to React
                    JSObject data = new JSObject();
                    data.put("clientId", conn.getRemoteSocketAddress().toString());
                    data.put("message", message);
                    notifyListeners("onMessageReceived", data);
                }
            } catch (JSONException e) {
                logToReact("Error parsing message: " + e.getMessage(), "error");
            }
        }

        void handleHostGameLogic(WebSocket conn, JSONObject json) throws JSONException {
            String type = json.optString("type");
            String socketId = (conn != null) ? conn.getRemoteSocketAddress().toString() : "host";

            if (type.equals("host_join")) {
                String playerName = json.optString("playerName", "المضيف");
                String themeId = json.optString("themeId", "normal");
                roomState = new JSONObject();
                roomState.put("id", "LOCAL_HOST");
                roomState.put("gameState", "waiting");
                roomState.put("round", 1);
                roomState.put("roundWinner", JSONObject.NULL);
                
                JSONObject players = new JSONObject();
                JSONObject host = new JSONObject();
                host.put("id", "host");
                host.put("name", playerName);
                host.put("themeId", themeId);
                host.put("deck", new JSONObject(INITIAL_DECK));
                host.put("score", 0);
                host.put("choice", JSONObject.NULL);
                host.put("readyForNext", false);
                players.put("host", host);
                
                roomState.put("players", players);
                broadcastRoomState();
            }

            if (type.equals("join_game")) {
                if (roomState == null) return;
                String playerName = json.optString("playerName", "لاعب");
                String themeId = json.optString("themeId", "normal");
                JSONObject players = roomState.getJSONObject("players");
                
                if (players.length() >= 2) {
                    JSONObject error = new JSONObject();
                    error.put("type", "error_msg");
                    error.put("msg", "الغرفة ممتلئة");
                    conn.send(error.toString());
                    return;
                }

                JSONObject player = new JSONObject();
                player.put("id", socketId);
                player.put("name", playerName);
                player.put("themeId", themeId);
                player.put("deck", new JSONObject(INITIAL_DECK));
                player.put("score", 0);
                player.put("choice", JSONObject.NULL);
                player.put("readyForNext", false);
                players.put(socketId, player);
                
                roomState.put("gameState", "playing");
                startRoundTimer();
                broadcastRoomState();
            }

            if (type.equals("play_card")) {
                if (roomState == null || !roomState.getString("gameState").equals("playing")) return;
                String choice = json.optString("choice");
                JSONObject players = roomState.getJSONObject("players");
                
                // Find player by socketId or "host"
                String playerId = "host";
                if (players.has(socketId)) playerId = socketId;
                
                JSONObject player = players.getJSONObject(playerId);
                if (!player.isNull("choice")) return;
                
                player.put("choice", choice);
                JSONObject deck = player.getJSONObject("deck");
                deck.put(choice, deck.getInt(choice) - 1);
                
                // Check if all players chose
                boolean allChose = true;
                java.util.Iterator<String> keys = players.keys();
                while (keys.hasNext()) {
                    if (players.getJSONObject(keys.next()).isNull("choice")) {
                        allChose = false;
                        break;
                    }
                }
                
                if (allChose) {
                    handleReveal();
                } else {
                    broadcastRoomState();
                }
            }

            if (type.equals("play_again")) {
                if (roomState == null || !roomState.getString("gameState").equals("gameOver")) return;
                JSONObject players = roomState.getJSONObject("players");
                String playerId = players.has(socketId) ? socketId : "host";
                
                players.getJSONObject(playerId).put("readyForNext", true);
                
                boolean allReady = true;
                java.util.Iterator<String> keys = players.keys();
                while (keys.hasNext()) {
                    if (!players.getJSONObject(keys.next()).getBoolean("readyForNext")) {
                        allReady = false;
                        break;
                    }
                }

                if (allReady) {
                    roomState.put("round", 1);
                    roomState.put("gameState", "playing");
                    roomState.put("roundWinner", JSONObject.NULL);
                    keys = players.keys();
                    while (keys.hasNext()) {
                        JSONObject p = players.getJSONObject(keys.next());
                        p.put("deck", new JSONObject(INITIAL_DECK));
                        p.put("score", 0);
                        p.put("choice", JSONObject.NULL);
                        p.put("readyForNext", false);
                    }
                    startRoundTimer();
                }
                broadcastRoomState();
            }

            if (type.equals("leave_room")) {
                stopAll();
            }
        }

        private void broadcastRoomState() throws JSONException {
            if (roomState == null) return;
            JSONObject msg = new JSONObject();
            msg.put("type", "room_state");
            msg.put("state", roomState);
            server.broadcast(msg.toString());
            
            // Also notify local React
            JSObject data = new JSObject();
            data.put("message", msg.toString());
            notifyListeners("onMessageReceived", data);
        }

        private void startRoundTimer() {
            if (roundTimer != null) roundTimer.cancel();
            roundTimer = new java.util.Timer();
            
            try {
                roomState.put("timeLeft", 15);
            } catch (JSONException e) { e.printStackTrace(); }

            roundTimer.scheduleAtFixedRate(new java.util.TimerTask() {
                @Override
                public void run() {
                    try {
                        int timeLeft = roomState.getInt("timeLeft") - 1;
                        roomState.put("timeLeft", timeLeft);
                        
                        if (timeLeft <= 0) {
                            roundTimer.cancel();
                            autoPlayCards();
                            handleReveal();
                        } else {
                            broadcastRoomState();
                        }
                    } catch (JSONException e) { e.printStackTrace(); }
                }
            }, 1000, 1000);
        }

        private void autoPlayCards() throws JSONException {
            JSONObject players = roomState.getJSONObject("players");
            java.util.Iterator<String> keys = players.keys();
            while (keys.hasNext()) {
                JSONObject p = players.getJSONObject(keys.next());
                if (p.isNull("choice")) {
                    JSONObject deck = p.getJSONObject("deck");
                    String[] types = {"rock", "paper", "scissors"};
                    for (String t : types) {
                        if (deck.getInt(t) > 0) {
                            p.put("choice", t);
                            deck.put(t, deck.getInt(t) - 1);
                            break;
                        }
                    }
                }
            }
        }

        private void handleReveal() throws JSONException {
            if (roundTimer != null) roundTimer.cancel();
            roomState.put("gameState", "revealing");
            broadcastRoomState();

            new java.util.Timer().schedule(new java.util.TimerTask() {
                @Override
                public void run() {
                    try {
                        resolveRound();
                    } catch (JSONException e) { e.printStackTrace(); }
                }
            }, 1200);
        }

        private void resolveRound() throws JSONException {
            JSONObject players = roomState.getJSONObject("players");
            List<String> ids = new ArrayList<>();
            java.util.Iterator<String> keys = players.keys();
            while (keys.hasNext()) ids.add(keys.next());
            
            if (ids.size() < 2) return;
            
            JSONObject p1 = players.getJSONObject(ids.get(0));
            JSONObject p2 = players.getJSONObject(ids.get(1));
            
            String c1 = p1.getString("choice");
            String c2 = p2.getString("choice");
            
            int winner = 0; // 0: draw, 1: p1, 2: p2
            if (!c1.equals(c2)) {
                if ((c1.equals("rock") && c2.equals("scissors")) || 
                    (c1.equals("paper") && c2.equals("rock")) || 
                    (c1.equals("scissors") && c2.equals("paper"))) {
                    winner = 1;
                } else {
                    winner = 2;
                }
            }

            int round = roomState.getInt("round");
            int points = 1;
            if (round >= 6 && round <= 8) points = 2;
            else if (round == 9) points = 3;

            if (winner == 1) {
                p1.put("score", p1.getInt("score") + points);
                roomState.put("roundWinner", p1.getString("id"));
            } else if (winner == 2) {
                p2.put("score", p2.getInt("score") + points);
                roomState.put("roundWinner", p2.getString("id"));
            } else {
                roomState.put("roundWinner", "draw");
            }

            roomState.put("gameState", "roundResult");
            broadcastRoomState();

            new java.util.Timer().schedule(new java.util.TimerTask() {
                @Override
                public void run() {
                    try {
                        startNextRound();
                    } catch (JSONException e) { e.printStackTrace(); }
                }
            }, 3000);
        }

        private void startNextRound() throws JSONException {
            int round = roomState.getInt("round");
            if (round >= 9) {
                roomState.put("gameState", "gameOver");
            } else {
                roomState.put("round", round + 1);
                roomState.put("gameState", "playing");
                roomState.put("roundWinner", JSONObject.NULL);
                JSONObject players = roomState.getJSONObject("players");
                java.util.Iterator<String> keys = players.keys();
                while (keys.hasNext()) {
                    JSONObject p = players.getJSONObject(keys.next());
                    p.put("choice", JSONObject.NULL);
                    p.put("readyForNext", false);
                }
                startRoundTimer();
            }
            broadcastRoomState();
        }

        @Override
        public void onError(WebSocket conn, Exception ex) {
            logToReact("Server Error: " + ex.getMessage(), "error");
        }

        @Override
        public void onStart() { logToReact("Server listening...", "info"); }
    }

    // Client Class
    private class GameWebSocketClient extends WebSocketClient {
        public GameWebSocketClient(URI serverUri) { super(serverUri); }

        @Override
        public void onOpen(ServerHandshake handshakedata) {
            logToReact("Connected to server, waiting for handshake...", "info");
            updateStatusToReact();
        }

        @Override
        public void onMessage(String message) {
            try {
                JSONObject json = new JSONObject(message);
                if (json.optString("type").equals("PING")) {
                    // Respond with PONG
                    JSONObject pong = new JSONObject();
                    pong.put("type", "PONG");
                    send(pong.toString());
                    
                    connectionStatus = "CONNECTION_VERIFIED";
                    logToReact("Handshake verified with server", "success");
                    updateStatusToReact();
                    if (role.equals("ONLINE")) {
                        notifyOnlineReady();
                    } else {
                        notifyRoomReady();
                    }
                } else {
                    JSObject data = new JSObject();
                    data.put("message", message);
                    notifyListeners("onMessageReceived", data);
                }
            } catch (JSONException e) {
                JSObject data = new JSObject();
                data.put("message", message);
                notifyListeners("onMessageReceived", data);
            }
        }

        @Override
        public void onClose(int code, String reason, boolean remote) {
            connectionStatus = "DISCONNECTED";
            logToReact("Disconnected from server: " + reason, "error");
            updateStatusToReact();
            
            try {
                JSONObject error = new JSONObject();
                error.put("type", "error_msg");
                error.put("msg", "الاستضافة أغلقت اللعبة أو لسبب ما انقطع الاتصال");
                JSObject data = new JSObject();
                data.put("message", error.toString());
                notifyListeners("onMessageReceived", data);
            } catch (Exception e) {}
        }

        @Override
        public void onError(Exception ex) {
            logToReact("Client Error: " + ex.getMessage(), "error");
        }
    }
}
