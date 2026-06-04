import { useEffect, useRef, useCallback } from "react";
import { realtimeService } from "../lib/realtime.service";
import { useAuthStore } from "../stores/authStore";

export function useRealtime(eventType, callback) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handler = (data) => callbackRef.current(data);
    const unsub = realtimeService.on(eventType, handler);
    return unsub;
  }, [eventType]);
}

export function useRealtimeConnection() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      realtimeService.connectStaff();
    } else {
      realtimeService.disconnect();
    }

    return () => {
      realtimeService.disconnect();
    };
  }, [isAuthenticated]);
}

export function useConversationRealtime(conversationId, callback) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!conversationId) return;

    const handler = (data) => {
      if (data?.conversation_id === conversationId || !data?.conversation_id) {
        callbackRef.current(data);
      }
    };

    const unsubChatMessage = realtimeService.on("chat.message.created", handler);
    const unsubConvUpdate = realtimeService.on("chat.conversation.updated", handler);

    realtimeService.connectConversation(conversationId);

    return () => {
      unsubChatMessage();
      unsubConvUpdate();
      realtimeService.disconnectConversation();
    };
  }, [conversationId]);
}
