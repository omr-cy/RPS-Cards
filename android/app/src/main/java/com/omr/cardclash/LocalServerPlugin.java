package com.omr.cardclash;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

import java.net.InetSocketAddress;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "LocalServer")
public class LocalServerPlugin extends Plugin {

    private GameWebSocketServer server;
    private List<WebSocket> clients = new ArrayList<>();

    @PluginMethod
    public void startServer(PluginCall call) {
        int port = call.getInt("port", 8080);
        
        if (server != null) {
            call.reject("Server already running");
            return;
        }

        server = new GameWebSocketServer(new InetSocketAddress(port));
        server.start();
        
        JSObject ret = new JSObject();
        ret.put("status", "started");
        ret.put("port", port);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopServer(PluginCall call) {
        if (server != null) {
            try {
                server.stop();
                server = null;
                clients.clear();
                call.resolve();
            } catch (InterruptedException e) {
                call.reject("Error stopping server", e);
            }
        } else {
            call.resolve();
        }
    }

    @PluginMethod
    public void broadcastMessage(PluginCall call) {
        String message = call.getString("message");
        
        if (server != null) {
            server.broadcast(message);
            call.resolve();
        } else {
            call.reject("Server not running");
        }
    }

    private class GameWebSocketServer extends WebSocketServer {

        public GameWebSocketServer(InetSocketAddress address) {
            super(address);
        }

        @Override
        public void onOpen(WebSocket conn, ClientHandshake handshake) {
            clients.add(conn);
            JSObject data = new JSObject();
            data.put("clientId", conn.getRemoteSocketAddress().toString());
            notifyListeners("onClientConnected", data);
        }

        @Override
        public void onClose(WebSocket conn, int code, String reason, boolean remote) {
            clients.remove(conn);
            JSObject data = new JSObject();
            data.put("clientId", conn.getRemoteSocketAddress().toString());
            notifyListeners("onClientDisconnected", data);
        }

        @Override
        public void onMessage(WebSocket conn, String message) {
            JSObject data = new JSObject();
            data.put("clientId", conn.getRemoteSocketAddress().toString());
            data.put("message", message);
            notifyListeners("onMessageReceived", data);
        }

        @Override
        public void onError(WebSocket conn, Exception ex) {
            ex.printStackTrace();
        }

        @Override
        public void onStart() {
            System.out.println("Server started successfully");
        }
    }
}
