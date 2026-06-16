"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MessengerFriend, PresenceStatus } from "@/types/database";
import { getInitials } from "@/lib/utils";
import {
  formatMessageTime,
  playMessageSound,
  presenceColor,
  presenceLabel,
  QUICK_EMOJIS,
} from "@/lib/messenger";
import {
  decryptDirectMessage,
  decryptPayload,
  deriveConversationKey,
  ensureUserEncryptionKeys,
  encryptAndUploadImage,
  encryptPayload,
  parsePublicKeyJwkFromProfile,
  previewFromPayload,
  type UiDirectMessage,
} from "@/lib/messengerCrypto";
import {
  ChevronDown,
  ImagePlus,
  Loader2,
  Lock,
  MessageCircle,
  Minus,
  Send,
  Smile,
  X,
} from "lucide-react";

type MessengerWidgetProps = {
  userId: string;
};

export function MessengerWidget({ userId }: MessengerWidgetProps) {
  const supabase = useMemo(() => createClient(), []);

  const [open, setOpen] = useState(false);
  const [presence, setPresence] = useState<PresenceStatus>("offline");
  const [friends, setFriends] = useState<MessengerFriend[]>([]);
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiDirectMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const privateKeyRef = useRef<CryptoKey | null>(null);
  const conversationKeysRef = useRef<Map<string, CryptoKey>>(new Map());
  const blobUrlsRef = useRef<string[]>([]);
  const openRef = useRef(open);
  const activeFriendRef = useRef(activeFriendId);
  const conversationRef = useRef(conversationId);

  openRef.current = open;
  activeFriendRef.current = activeFriendId;
  conversationRef.current = conversationId;

  const activeFriend = friends.find((friend) => friend.id === activeFriendId) || null;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const revokeBlobUrls = useCallback(() => {
    blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    blobUrlsRef.current = [];
  }, []);

  const getConversationKey = useCallback(
    async (convId: string, friendId: string): Promise<CryptoKey | null> => {
      const cached = conversationKeysRef.current.get(convId);
      if (cached) return cached;

      if (!privateKeyRef.current) return null;

      const friend = friends.find((item) => item.id === friendId);
      const friendPublicJwk = parsePublicKeyJwkFromProfile(friend?.encryption_public_key);
      if (!friendPublicJwk) return null;

      const key = await deriveConversationKey(privateKeyRef.current, friendPublicJwk, convId);
      conversationKeysRef.current.set(convId, key);
      return key;
    },
    [friends]
  );

  const refreshInbox = useCallback(async () => {
    const { data: friendships } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (!friendships?.length) {
      setFriends([]);
      setUnreadTotal(0);
      setLoadingFriends(false);
      return;
    }

    const friendIds = friendships.map((friendship) =>
      friendship.requester_id === userId
        ? friendship.addressee_id
        : friendship.requester_id
    );

    const [{ data: profiles }, { data: conversations }, { data: readStates }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, username, display_name, avatar_url, presence_status, encryption_public_key"
          )
          .in("id", friendIds),
        supabase
          .from("direct_conversations")
          .select("*")
          .or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`),
        supabase.from("dm_read_state").select("*").eq("user_id", userId),
      ]);

    const conversationIds = conversations?.map((conversation) => conversation.id) || [];
    let latestMessages: UiDirectMessage[] = [];

    if (conversationIds.length > 0) {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(200);

      latestMessages = (data || []) as UiDirectMessage[];
    }

    const readMap = new Map(
      readStates?.map((state) => [state.conversation_id, state.last_read_at]) || []
    );

    let totalUnread = 0;
    const enrichedFriends: MessengerFriend[] = await Promise.all(
      (profiles || []).map(async (profile) => {
      const conversation = conversations?.find(
        (item) => item.user_one_id === profile.id || item.user_two_id === profile.id
      );

      const conversationMessages = conversation
        ? latestMessages.filter((message) => message.conversation_id === conversation.id)
        : [];
      const lastMessage = conversationMessages[0];
      const lastReadAt = conversation ? readMap.get(conversation.id) : null;
      const unreadCount = conversationMessages.filter(
        (message) =>
          message.sender_id !== userId &&
          (!lastReadAt || new Date(message.created_at) > new Date(lastReadAt))
      ).length;

      totalUnread += unreadCount;

      let lastMessagePreview: string | undefined;
      if (lastMessage) {
        if (lastMessage.is_encrypted && conversation && privateKeyRef.current) {
          const friendPublicJwk = parsePublicKeyJwkFromProfile(profile.encryption_public_key);
          if (friendPublicJwk) {
            try {
              const key = await deriveConversationKey(
                privateKeyRef.current,
                friendPublicJwk,
                conversation.id
              );
              const payload = await decryptPayload(key, lastMessage.content);
              lastMessagePreview = previewFromPayload(payload);
            } catch {
              lastMessagePreview = "🔒 Encrypted message";
            }
          } else {
            lastMessagePreview = "🔒 Encrypted message";
          }
        } else if (lastMessage.image_url) {
          lastMessagePreview = "📷 Photo";
        } else {
          lastMessagePreview = lastMessage.content;
        }
      }

      return {
        ...profile,
        presence_status: (profile.presence_status as PresenceStatus) || "offline",
        conversationId: conversation?.id,
        lastMessage: lastMessagePreview,
        lastMessageAt: lastMessage?.created_at || conversation?.last_message_at,
        unreadCount,
      };
    })
    );

    enrichedFriends.sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });

    setFriends(enrichedFriends);
    setUnreadTotal(totalUnread);
    setLoadingFriends(false);
  }, [supabase, userId]);

  const markConversationRead = useCallback(
    async (convId: string) => {
      await supabase.from("dm_read_state").upsert(
        {
          conversation_id: convId,
          user_id: userId,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: "conversation_id,user_id" }
      );

      await refreshInbox();
    },
    [supabase, userId, refreshInbox]
  );

  const loadMessages = useCallback(
    async (convId: string, friendId: string) => {
      setLoadingChat(true);
      revokeBlobUrls();

      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true })
        .limit(100);

      const conversationKey = await getConversationKey(convId, friendId);
      const decrypted = await Promise.all(
        ((data || []) as UiDirectMessage[]).map(async (message) => {
          const uiMessage = await decryptDirectMessage(message, conversationKey, supabase);
          if (uiMessage.decryptedImageUrl) {
            blobUrlsRef.current.push(uiMessage.decryptedImageUrl);
          }
          return uiMessage;
        })
      );

      setMessages(decrypted);
      setLoadingChat(false);
      await markConversationRead(convId);
      setTimeout(scrollToBottom, 50);
    },
    [supabase, markConversationRead, scrollToBottom, getConversationKey, revokeBlobUrls]
  );

  const openChatWithFriend = useCallback(
    async (friendId: string) => {
      setActiveFriendId(friendId);
      setLoadingChat(true);

      const { data: convId, error } = await supabase.rpc("get_or_create_dm_conversation", {
        p_other_user_id: friendId,
      });

      if (error || !convId) {
        setLoadingChat(false);
        return;
      }

      setConversationId(convId);
      await loadMessages(convId, friendId);
      await refreshInbox();
    },
    [supabase, loadMessages, refreshInbox]
  );

  const sendMessage = useCallback(
    async (content: string, imagePath?: string | null, imageIv?: string | null) => {
      if (!conversationId || !activeFriendId || sending) return;
      if (!content.trim() && !imagePath) return;

      const conversationKey = await getConversationKey(conversationId, activeFriendId);
      if (!conversationKey) {
        setSending(false);
        return;
      }

      setSending(true);
      const encryptedContent = await encryptPayload(conversationKey, {
        text: content.trim(),
        imagePath: imagePath || undefined,
        imageIv: imageIv || undefined,
      });

      const { data, error } = await supabase
        .from("direct_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content: encryptedContent,
          image_url: null,
          is_encrypted: true,
        })
        .select("*")
        .single();

      if (!error && data) {
        const uiMessage = await decryptDirectMessage(
          data as UiDirectMessage,
          conversationKey,
          supabase
        );
        if (uiMessage.decryptedImageUrl) {
          blobUrlsRef.current.push(uiMessage.decryptedImageUrl);
        }
        setMessages((prev) => [...prev, uiMessage]);
        setMessageInput("");
        setShowEmoji(false);
        setTimeout(scrollToBottom, 50);
        await refreshInbox();
      }

      setSending(false);
    },
    [
      conversationId,
      activeFriendId,
      sending,
      supabase,
      userId,
      scrollToBottom,
      refreshInbox,
      getConversationKey,
    ]
  );

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!conversationId || !activeFriendId || uploadingImage) return;

      setUploadingImage(true);
      try {
        const conversationKey = await getConversationKey(conversationId, activeFriendId);
        if (!conversationKey) {
          setUploadingImage(false);
          return;
        }

        const { imagePath, imageIv } = await encryptAndUploadImage(
          supabase,
          conversationKey,
          userId,
          file
        );
        await sendMessage(messageInput, imagePath, imageIv);
      } catch {
        // upload or encryption failed
      }
      setUploadingImage(false);
    },
    [
      conversationId,
      activeFriendId,
      uploadingImage,
      supabase,
      userId,
      sendMessage,
      messageInput,
      getConversationKey,
    ]
  );

  const updatePresence = useCallback(
    async (status: PresenceStatus) => {
      setPresence(status);
      await supabase
        .from("profiles")
        .update({
          presence_status: status,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", userId);
    },
    [supabase, userId]
  );

  useEffect(() => {
    async function init() {
      const { privateKey } = await ensureUserEncryptionKeys(userId, supabase);
      privateKeyRef.current = privateKey;

      const { data: profile } = await supabase
        .from("profiles")
        .select("presence_status")
        .eq("id", userId)
        .maybeSingle();

      setPresence((profile?.presence_status as PresenceStatus) || "offline");
      await refreshInbox();
    }

    init();
  }, [supabase, userId, refreshInbox]);

  useEffect(() => {
    return () => {
      revokeBlobUrls();
    };
  }, [revokeBlobUrls]);

  useEffect(() => {
    const channel = supabase
      .channel(`messenger:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        async (payload) => {
          const message = payload.new as UiDirectMessage;
          const isMine = message.sender_id === userId;
          const isActiveConversation = message.conversation_id === conversationRef.current;

          if (isActiveConversation && openRef.current && activeFriendRef.current) {
            const conversationKey = await getConversationKey(
              message.conversation_id,
              activeFriendRef.current
            );
            const uiMessage = await decryptDirectMessage(message, conversationKey, supabase);
            if (uiMessage.decryptedImageUrl) {
              blobUrlsRef.current.push(uiMessage.decryptedImageUrl);
            }
            setMessages((prev) =>
              prev.some((item) => item.id === uiMessage.id) ? prev : [...prev, uiMessage]
            );
            if (!isMine) {
              await markConversationRead(message.conversation_id);
            }
            setTimeout(scrollToBottom, 50);
          } else if (!isMine) {
            playMessageSound();
          }

          await refreshInbox();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const updated = payload.new as { id: string; presence_status?: PresenceStatus };
          setFriends((prev) =>
            prev.map((friend) =>
              friend.id === updated.id
                ? {
                    ...friend,
                    presence_status: updated.presence_status || friend.presence_status,
                  }
                : friend
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, refreshInbox, markConversationRead, scrollToBottom, getConversationKey]);

  useEffect(() => {
    if (open && activeFriendId && conversationId) {
      scrollToBottom();
    }
  }, [open, activeFriendId, conversationId, messages.length, scrollToBottom]);

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-[90] w-[min(calc(100vw-2rem),380px)] h-[min(70dvh,520px)] glass-card border border-slate-700/60 shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-700/50 bg-slate-900/80">
            <div className="min-w-0">
              <p className="font-semibold text-sm">Messages</p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3 text-green-400" />
                End-to-end encrypted
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={presence}
                  onChange={(e) => updatePresence(e.target.value as PresenceStatus)}
                  className="appearance-none bg-slate-800 border border-slate-700 rounded-lg text-xs pl-7 pr-7 py-1.5 cursor-pointer"
                  aria-label="Set your status"
                >
                  <option value="online">Online</option>
                  <option value="busy">Busy</option>
                  <option value="offline">Offline</option>
                </select>
                <span
                  className={`absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${presenceColor(presence)}`}
                />
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"
                aria-label="Minimize messenger"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            <div
              className={`${activeFriend ? "hidden sm:flex" : "flex"} w-full sm:w-36 border-r border-slate-700/50 flex-col min-h-0`}
            >
              <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-slate-500">
                Friends
              </div>
              <div className="flex-1 overflow-y-auto theme-scrollbar">
                {loadingFriends ? (
                  <div className="p-4 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-gold-400" />
                  </div>
                ) : friends.length === 0 ? (
                  <p className="p-4 text-xs text-slate-500">
                    Add friends from Community to start messaging.
                  </p>
                ) : (
                  friends.map((friend) => (
                    <button
                      key={friend.id}
                      type="button"
                      onClick={() => openChatWithFriend(friend.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-800/60 transition-colors ${
                        activeFriendId === friend.id ? "bg-slate-800/80" : ""
                      }`}
                    >
                      <div className="relative shrink-0">
                        {friend.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={friend.avatar_url}
                            alt=""
                            className="w-9 h-9 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold-600 to-bronze-600 flex items-center justify-center text-xs font-bold text-slate-950">
                            {getInitials(friend.display_name)}
                          </div>
                        )}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${presenceColor(friend.presence_status)}`}
                          title={presenceLabel(friend.presence_status)}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{friend.display_name}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {friend.lastMessage || "No messages yet"}
                        </p>
                      </div>
                      {(friend.unreadCount || 0) > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-gold-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                          {friend.unreadCount! > 9 ? "9+" : friend.unreadCount}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div
              className={`${activeFriend ? "flex" : "hidden sm:flex"} flex-1 flex-col min-h-0 min-w-0`}
            >
              {activeFriend ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/40">
                    <button
                      type="button"
                      className="sm:hidden p-1 rounded-lg hover:bg-slate-800 text-slate-400"
                      onClick={() => {
                        setActiveFriendId(null);
                        setConversationId(null);
                        setMessages([]);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{activeFriend.display_name}</p>
                      <p className="text-[11px] text-slate-500">
                        {presenceLabel(activeFriend.presence_status)}
                        {!activeFriend.encryption_public_key && " · Encryption pending"}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto theme-scrollbar px-3 py-3 space-y-2">
                    {loadingChat ? (
                      <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-gold-400" />
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isMine = message.sender_id === userId;
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                                isMine
                                  ? "bg-gold-500/20 border border-gold-500/30 text-slate-100"
                                  : "bg-slate-800/80 border border-slate-700/50 text-slate-200"
                              }`}
                            >
                              {message.decryptedImageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={message.decryptedImageUrl}
                                  alt="Shared"
                                  className="rounded-lg max-w-full max-h-48 object-cover mb-2"
                                />
                              )}
                              {message.decryptedText && (
                                <p className="whitespace-pre-wrap break-words">
                                  {message.decryptedText}
                                </p>
                              )}
                              <p className="text-[10px] text-slate-500 mt-1 text-right">
                                {formatMessageTime(message.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {showEmoji && (
                    <div className="px-3 pb-2 grid grid-cols-8 gap-1">
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setMessageInput((prev) => prev + emoji)}
                          className="text-lg p-1 rounded hover:bg-slate-800"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  <form
                    className="border-t border-slate-700/50 p-3 flex items-end gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void sendMessage(messageInput);
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleImageUpload(file);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmoji((prev) => !prev)}
                      className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 shrink-0"
                      aria-label="Insert emoji"
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 shrink-0"
                      aria-label="Share photo"
                    >
                      {uploadingImage ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ImagePlus className="w-4 h-4" />
                      )}
                    </button>
                    <textarea
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Write a message..."
                      rows={1}
                      className="input-field min-h-[40px] max-h-24 py-2 text-sm resize-none flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendMessage(messageInput);
                        }
                      }}
                    />
                    <button
                      type="submit"
                      disabled={sending || (!messageInput.trim() && !uploadingImage)}
                      className="btn-primary p-2.5 shrink-0"
                      aria-label="Send message"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-6 text-center text-sm text-slate-500">
                  Select a friend to start chatting.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "Minimize messenger" : "Open messenger"}
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[90] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all ${
          unreadTotal > 0 && !open
            ? "bg-gold-500 text-slate-950 ring-4 ring-gold-400/40 animate-pulse"
            : "bg-slate-900 border border-slate-700 text-gold-400 hover:border-gold-500/40"
        }`}
      >
        <MessageCircle className="w-6 h-6" />
        {unreadTotal > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center border-2 border-slate-950">
            {unreadTotal > 9 ? "9+" : unreadTotal}
          </span>
        )}
      </button>
    </>
  );
}
