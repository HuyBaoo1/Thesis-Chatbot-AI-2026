const API_BASE = import.meta.env.VITE_API_URL || "/api";
const ACCESS_TOKEN_KEY = "auth_access_token";

const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;
const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_TIMEOUT = 10000;

function getAccessToken() {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

function buildWsUrl(path) {
  const base = API_BASE.replace(/^http/, "ws");
  return `${base}${path}`;
}

function setWsAuthCookie(token) {
  try {
    const base = new URL(API_BASE, window.location.origin);
    document.cookie = `access_token=${encodeURIComponent(token)}; path=${base.pathname}; SameSite=Lax; max-age=31536000`;
  } catch {
    // ignore
  }
}

function clearWsAuthCookie() {
  try {
    const base = new URL(API_BASE, window.location.origin);
    document.cookie = `access_token=; path=${base.pathname}; SameSite=Lax; max-age=0`;
  } catch {
    // ignore
  }
}

class RealtimeService {
  constructor() {
    this._staffWs = null;
    this._conversationWs = null;
    this._conversationId = null;
    this._listeners = new Map();
    this._reconnectAttempts = 0;
    this._reconnectTimer = null;
    this._heartbeatTimer = null;
    this._heartbeatTimeoutTimer = null;
    this._convReconnectAttempts = 0;
    this._convReconnectTimer = null;
    this._convHeartbeatTimer = null;
    this._convHeartbeatTimeoutTimer = null;
    this._connected = false;
    this._conversationConnected = false;
    this._conversationRefCount = 0;
  }

  get isConnected() {
    return this._connected;
  }

  get isConversationConnected() {
    return this._conversationConnected;
  }

  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const set = this._listeners.get(event);
    if (set) {
      set.delete(callback);
      if (set.size === 0) this._listeners.delete(event);
    }
  }

  _emit(event, data) {
    const set = this._listeners.get(event);
    if (set) {
      for (const cb of set) {
        try {
          cb(data);
        } catch (err) {
          console.error("[realtime] listener error:", err);
        }
      }
    }
    const wildcard = this._listeners.get("*");
    if (wildcard) {
      for (const cb of wildcard) {
        try {
          cb({ event, data });
        } catch (err) {
          console.error("[realtime] wildcard listener error:", err);
        }
      }
    }
  }

  connectStaff() {
    const token = getAccessToken();
    if (!token) {
      console.warn("[realtime] No access token — skipping staff WS");
      return;
    }

    this._disconnectStaff();

    setWsAuthCookie(token);
    const url = buildWsUrl("/realtime/ws");
    this._staffWs = new WebSocket(url);

    this._staffWs.onopen = () => {
      console.info("[realtime] Staff WS connected");
      this._connected = true;
      this._reconnectAttempts = 0;
      this._emit("connected", { channel: "staff" });
      this._startHeartbeat();
    };

    this._staffWs.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (typeof data !== "object" || data === null || typeof data.type !== "string") {
        return;
      }

      if (data.type === "pong") {
        this._clearHeartbeatTimeout();
        return;
      }

      this._emit(data.type, data.payload || data);
    };

    this._staffWs.onclose = (event) => {
      this._connected = false;
      this._stopHeartbeat();
      this._emit("disconnected", { channel: "staff", code: event.code });
      if (event.code !== 1008) {
        this._scheduleStaffReconnect();
      }
    };

    this._staffWs.onerror = (err) => {
      console.error("[realtime] Staff WS error:", err);
    };
  }

  connectConversation(conversationId) {
    if (!conversationId) return;

    if (this._conversationId === conversationId && this._conversationConnected) {
      this._conversationRefCount++;
      return;
    }

    this._disconnectConversation();
    this._conversationId = conversationId;
    this._conversationRefCount = 1;

    const url = buildWsUrl(`/realtime/conversations/${conversationId}/ws`);
    const ws = new WebSocket(url);
    this._conversationWs = ws;

    ws.onopen = () => {
      if (this._conversationWs !== ws) return;
      console.info("[realtime] Conversation WS connected:", conversationId);
      this._conversationConnected = true;
      this._convReconnectAttempts = 0;
      this._emit("connected", { channel: "conversation", conversationId });
      this._startConversationHeartbeat();
    };

    ws.onmessage = (event) => {
      if (this._conversationWs !== ws) return;
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      if (typeof data !== "object" || data === null || typeof data.type !== "string") {
        return;
      }

      if (data.type === "pong") {
        this._clearConversationHeartbeatTimeout();
        return;
      }

      this._emit(data.type, data.payload || data);
    };

    ws.onclose = (event) => {
      if (this._conversationWs !== ws) return;
      this._conversationConnected = false;
      this._stopConversationHeartbeat();
      this._emit("disconnected", { channel: "conversation", conversationId: this._conversationId, code: event.code });
      if (this._conversationId) {
        this._scheduleConversationReconnect();
      }
    };

    ws.onerror = (err) => {
      if (this._conversationWs !== ws) return;
      console.error("[realtime] Conversation WS error:", err);
    };
  }

  disconnect() {
    this._disconnectStaff();
    this._disconnectConversation();
    this._conversationId = null;
    this._conversationRefCount = 0;
    clearWsAuthCookie();
  }

  disconnectConversation() {
    this._conversationRefCount--;
    if (this._conversationRefCount > 0) return;
    this._disconnectConversation();
    this._conversationId = null;
  }

  _disconnectStaff() {
    if (this._staffWs) {
      this._staffWs.onclose = null;
      this._staffWs.close(1000, "client disconnect");
      this._staffWs = null;
    }
    this._connected = false;
    this._stopHeartbeat();
    clearTimeout(this._reconnectTimer);
    this._reconnectTimer = null;
  }

  _disconnectConversation() {
    if (this._conversationWs) {
      this._conversationWs.onclose = null;
      this._conversationWs.close(1000, "client disconnect");
      this._conversationWs = null;
    }
    this._conversationConnected = false;
    this._stopConversationHeartbeat();
    clearTimeout(this._convReconnectTimer);
    this._convReconnectTimer = null;
  }

  _scheduleStaffReconnect() {
    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, this._reconnectAttempts),
      RECONNECT_MAX_DELAY
    );
    this._reconnectAttempts++;
    console.info(`[realtime] Staff WS reconnect in ${delay}ms (attempt ${this._reconnectAttempts})`);
    clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(() => this.connectStaff(), delay);
  }

  _scheduleConversationReconnect() {
    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, this._convReconnectAttempts),
      RECONNECT_MAX_DELAY
    );
    this._convReconnectAttempts++;
    console.info(`[realtime] Conversation WS reconnect in ${delay}ms (attempt ${this._convReconnectAttempts})`);
    clearTimeout(this._convReconnectTimer);
    this._convReconnectTimer = setTimeout(() => {
      if (this._conversationId) {
        this.connectConversation(this._conversationId);
      }
    }, delay);
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this._heartbeatTimer = setInterval(() => {
      if (this._staffWs?.readyState === WebSocket.OPEN) {
        this._clearHeartbeatTimeout();
        this._staffWs.send("ping");
        this._heartbeatTimeoutTimer = setTimeout(() => {
          console.warn("[realtime] Staff WS heartbeat timeout — closing");
          this._staffWs?.close(4000, "heartbeat timeout");
        }, HEARTBEAT_TIMEOUT);
      }
    }, HEARTBEAT_INTERVAL);
  }

  _stopHeartbeat() {
    clearInterval(this._heartbeatTimer);
    this._heartbeatTimer = null;
    this._clearHeartbeatTimeout();
  }

  _clearHeartbeatTimeout() {
    clearTimeout(this._heartbeatTimeoutTimer);
    this._heartbeatTimeoutTimer = null;
  }

  _startConversationHeartbeat() {
    this._stopConversationHeartbeat();
    this._convHeartbeatTimer = setInterval(() => {
      if (this._conversationWs?.readyState === WebSocket.OPEN) {
        this._clearConversationHeartbeatTimeout();
        this._conversationWs.send("ping");
        this._convHeartbeatTimeoutTimer = setTimeout(() => {
          console.warn("[realtime] Conversation WS heartbeat timeout — closing");
          this._conversationWs?.close(4000, "heartbeat timeout");
        }, HEARTBEAT_TIMEOUT);
      }
    }, HEARTBEAT_INTERVAL);
  }

  _stopConversationHeartbeat() {
    clearInterval(this._convHeartbeatTimer);
    this._convHeartbeatTimer = null;
    this._clearConversationHeartbeatTimeout();
  }

  _clearConversationHeartbeatTimeout() {
    clearTimeout(this._convHeartbeatTimeoutTimer);
    this._convHeartbeatTimeoutTimer = null;
  }
}

export const realtimeService = new RealtimeService();
export default realtimeService;
