"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MessengerFriend, PresenceStatus } from "@/types/database";
import { getInitials } from "@/lib/utils";
import {
  formatMessageTime,
  MESSENGER_FRIENDS_CHANGED,
  playMessageSound,
  presenceColor,
  presenceLabel,
  QUICK_EMOJIS,
  buildReplyPreview,
  encodePlaintextPayload,
  previewFromPlaintextContent,
} from "@/lib/messenger";
import {
  decryptDirectMessage,
  decryptPayload,
  deriveConversationKey,
  ensureUserEncryptionKeys,
  prepareMessagingKeys,
  restoreMessagingKeysFromPin,
  restoreMessagingKeysFromPassword,
  setupMessagingPin,
  validateMessagingPin,
  encryptAndUploadImage,
  encryptPayload,
  isEncryptedContent,
  parsePublicKeyJwkFromProfile,
  previewFromPayload,
  type UiDirectMessage,
  type MessagingPinLength,
} from "@/lib/messengerCrypto";
import {
  ChevronDown,
  CornerDownRight,
  ImagePlus,
  Loader2,
  Lock,
  MessageCircle,
  Minus,
  Send,
  Shield,
  Smile,
  Trash2,
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
  const [sendError, setSendError] = useState<string | null>(null);
  const [showKeysResetNotice, setShowKeysResetNotice] = useState(false);
  const [restorePin, setRestorePin] = useState("");
  const [restorePassword, setRestorePassword] = useState("");
  const [restorePinLength, setRestorePinLength] = useState<MessagingPinLength | null>(6);
  const [legacyPasswordBackup, setLegacyPasswordBackup] = useState(false);
  const [restoringKeys, setRestoringKeys] = useState(false);
  const [needsPinSetup, setNeedsPinSetup] = useState(false);
  const [showPinSetupPanel, setShowPinSetupPanel] = useState(false);
  const [setupPinLength, setSetupPinLength] = useState<MessagingPinLength>(6);
  const [setupPin, setSetupPin] = useState("");
  const [confirmSetupPin, setConfirmSetupPin] = useState("");
  const [settingUpPin, setSettingUpPin] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingHistory, setDeletingHistory] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [replyingTo, setReplyingTo] = useState<UiDirectMessage | null>(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const privateKeyRef = useRef<CryptoKey | null>(null);
  const conversationKeysRef = useRef<Map<string, CryptoKey>>(new Map());
  const blobUrlsRef = useRef<string[]>([]);
  const didInitRef = useRef(false);
  const presenceRef = useRef<PresenceStatus>("online");
  const keysRegeneratedRef = useRef(false);
  const openRef = useRef(open);
  const activeFriendRef = useRef(activeFriendId);
  const conversationRef = useRef(conversationId);
  const messagesRef = useRef(messages);
  const replyingToRef = useRef(replyingTo);

  openRef.current = open;
  activeFriendRef.current = activeFriendId;
  conversationRef.current = conversationId;
  messagesRef.current = messages;
  presenceRef.current = presence;
  replyingToRef.current = replyingTo;

  const activeFriend = friends.find((friend) => friend.id === activeFriendId) || null;

  const replyAuthorName = useCallback(
    (senderId: string) => {
      if (senderId === userId) return "You";
      return activeFriend?.display_name || "Friend";
    },
    [userId, activeFriend?.display_name]
  );

  const getDecryptOptions = useCallback(
    () => ({ keysRegenerated: keysRegeneratedRef.current }),
    []
  );

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

      let friendPublicJwk = parsePublicKeyJwkFromProfile(
        friends.find((item) => item.id === friendId)?.encryption_public_key
      );

      if (!friendPublicJwk) {
        const { data } = await supabase
          .from("profiles")
          .select("encryption_public_key")
          .eq("id", friendId)
          .maybeSingle();
        friendPublicJwk = parsePublicKeyJwkFromProfile(data?.encryption_public_key);
      }

      if (!friendPublicJwk) return null;

      const key = await deriveConversationKey(privateKeyRef.current, friendPublicJwk, convId);
      conversationKeysRef.current.set(convId, key);
      return key;
    },
    [friends, supabase]
  );

  const waitForPrivateKey = useCallback(async (timeoutMs = 8000): Promise<boolean> => {
    if (privateKeyRef.current) return true;
    const deadline = Date.now() + timeoutMs;
    while (!privateKeyRef.current && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return !!privateKeyRef.current;
  }, []);

  const resolveConversationKey = useCallback(
    async (convId: string, friendId: string): Promise<CryptoKey | null> => {
      await waitForPrivateKey();
      let key = await getConversationKey(convId, friendId);
      if (!key) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        key = await getConversationKey(convId, friendId);
      }
      return key;
    },
    [getConversationKey, waitForPrivateKey]
  );

  const redecryptVisibleMessages = useCallback(async () => {
    const convId = conversationRef.current;
    const friendId = activeFriendRef.current;
    if (!convId || !friendId || !privateKeyRef.current) return;

    const prev = messagesRef.current;
    const needsFix = prev.some(
      (message) =>
        message.is_encrypted &&
        (!message.decryptedText ||
          message.decryptedText === "🔒 Encrypted message" ||
          isEncryptedContent(message.decryptedText))
    );
    if (!needsFix) return;

    const key = await resolveConversationKey(convId, friendId);
    if (!key) return;

    revokeBlobUrls();
    const fixed = await Promise.all(
      prev.map((message) => decryptDirectMessage(message, key, supabase, getDecryptOptions()))
    );
    fixed.forEach((message) => {
      if (message.decryptedImageUrl) {
        blobUrlsRef.current.push(message.decryptedImageUrl);
      }
    });
    setMessages(fixed);
  }, [resolveConversationKey, supabase, revokeBlobUrls, getDecryptOptions]);

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
              lastMessagePreview = previewFromPayload(payload, keysRegeneratedRef.current);
            } catch {
              lastMessagePreview = previewFromPayload(null, keysRegeneratedRef.current);
            }
          } else {
            lastMessagePreview = "🔒 Encrypted message";
          }
        } else if (lastMessage.is_encrypted) {
          lastMessagePreview = "🔒 Encrypted message";
        } else if (lastMessage.image_url) {
          lastMessagePreview = "📷 Photo";
        } else {
          lastMessagePreview = previewFromPlaintextContent(
            lastMessage.content,
            lastMessage.image_url
          );
        }
      }

      return {
        ...profile,
        presence_status: (profile.presence_status as PresenceStatus) || "online",
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
    async (convId: string, skipInboxRefresh = false) => {
      await supabase.from("dm_read_state").upsert(
        {
          conversation_id: convId,
          user_id: userId,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: "conversation_id,user_id" }
      );

      if (!skipInboxRefresh) {
        await refreshInbox();
      }
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

      const conversationKey = await resolveConversationKey(convId, friendId);
      const decrypted = await Promise.all(
        ((data || []) as UiDirectMessage[]).map(async (message) => {
          const uiMessage = await decryptDirectMessage(
            message,
            conversationKey,
            supabase,
            getDecryptOptions()
          );
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
    [supabase, markConversationRead, scrollToBottom, resolveConversationKey, revokeBlobUrls, getDecryptOptions]
  );

  const openChatWithFriend = useCallback(
    async (friendId: string) => {
      setActiveFriendId(friendId);
      setReplyingTo(null);
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

  const deleteConversationHistory = useCallback(async () => {
    if (!conversationId || !activeFriendId || deletingHistory) return;

    setDeletingHistory(true);
    setSendError(null);

    try {
      const conversationKey = await resolveConversationKey(conversationId, activeFriendId);
      const imagePaths: string[] = [];

      for (const message of messagesRef.current) {
        if (message.is_encrypted && conversationKey && isEncryptedContent(message.content)) {
          const payload = await decryptPayload(conversationKey, message.content);
          if (payload?.imagePath) {
            imagePaths.push(payload.imagePath);
          }
        } else if (message.image_url) {
          imagePaths.push(message.image_url);
        }
      }

      if (imagePaths.length > 0) {
        await supabase.storage.from("message-images").remove(imagePaths);
      }

      const { error } = await supabase.rpc("clear_dm_conversation", {
        p_conversation_id: conversationId,
      });

      if (error) {
        setSendError("Could not delete chat history. Please try again.");
        setDeletingHistory(false);
        return;
      }

      revokeBlobUrls();
      conversationKeysRef.current.delete(conversationId);
      setMessages([]);
      setConversationId(null);
      setShowDeleteConfirm(false);
      setShowEmoji(false);
      await refreshInbox();
    } catch {
      setSendError("Could not delete chat history. Please try again.");
    }

    setDeletingHistory(false);
  }, [
    conversationId,
    activeFriendId,
    deletingHistory,
    supabase,
    resolveConversationKey,
    revokeBlobUrls,
    refreshInbox,
  ]);

  const sendMessage = useCallback(
    async (content: string, imagePath?: string | null, imageIv?: string | null) => {
      if (!activeFriendId || sending) return;
      if (!content.trim() && !imagePath) return;

      setSending(true);
      setSendError(null);

      let convId = conversationId;
      if (!convId) {
        const { data: newConvId, error: convError } = await supabase.rpc(
          "get_or_create_dm_conversation",
          { p_other_user_id: activeFriendId }
        );
        if (convError || !newConvId) {
          setSendError("Could not start conversation. Please try again.");
          setSending(false);
          return;
        }
        convId = newConvId;
        setConversationId(newConvId);
      }

      if (!convId) {
        setSendError("Could not start conversation. Please try again.");
        setSending(false);
        return;
      }

      const conversationKey = await getConversationKey(convId, activeFriendId);
      const trimmed = content.trim();
      const replyTarget = replyingToRef.current;

      const payload: {
        text: string;
        imagePath?: string;
        imageIv?: string;
        replyToId?: string;
        replyPreview?: ReturnType<typeof buildReplyPreview>;
      } = {
        text: trimmed,
        imagePath: imagePath || undefined,
        imageIv: imageIv || undefined,
      };

      if (replyTarget) {
        payload.replyToId = replyTarget.id;
        payload.replyPreview = buildReplyPreview(replyTarget);
      }

      let messageContent: string;
      let isEncrypted = false;

      if (conversationKey) {
        messageContent = await encryptPayload(conversationKey, payload);
        isEncrypted = true;
      } else if (imagePath) {
        setSendError("Photo sharing needs both friends to open Messages once.");
        setSending(false);
        return;
      } else if (!privateKeyRef.current) {
        setSendError("Setting up encryption — try again in a moment.");
        setSending(false);
        return;
      } else {
        messageContent = encodePlaintextPayload(payload);
      }

      const { data, error } = await supabase
        .from("direct_messages")
        .insert({
          conversation_id: convId,
          sender_id: userId,
          content: messageContent,
          image_url: null,
          is_encrypted: isEncrypted,
          reply_to_id: replyTarget?.id ?? null,
        })
        .select("*")
        .single();

      if (error) {
        setSendError("Could not send message. Please try again.");
        setSending(false);
        return;
      }

      if (data) {
        const uiMessage = await decryptDirectMessage(
          data as UiDirectMessage,
          conversationKey,
          supabase,
          getDecryptOptions()
        );
        if (uiMessage.decryptedImageUrl) {
          blobUrlsRef.current.push(uiMessage.decryptedImageUrl);
        }
        setMessages((prev) => [...prev, uiMessage]);
        setMessageInput("");
        setReplyingTo(null);
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
      getDecryptOptions,
    ]
  );

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!activeFriendId || uploadingImage) return;

      setUploadingImage(true);
      try {
        let convId = conversationId;
        if (!convId) {
          const { data: newConvId, error: convError } = await supabase.rpc(
            "get_or_create_dm_conversation",
            { p_other_user_id: activeFriendId }
          );
          if (convError || !newConvId) {
            setSendError("Could not start conversation. Please try again.");
            setUploadingImage(false);
            return;
          }
          convId = newConvId;
          setConversationId(newConvId);
        }

        if (!convId) {
          setSendError("Could not start conversation. Please try again.");
          setUploadingImage(false);
          return;
        }

        const conversationKey = await getConversationKey(convId, activeFriendId);
        if (!conversationKey) {
          setSendError("Photo sharing needs both friends to open Messages once.");
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
      const previous = presenceRef.current;
      setPresence(status);

      const { error } = await supabase
        .from("profiles")
        .update({
          presence_status: status,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        setPresence(previous);
        setSendError("Could not update your status. Please try again.");
      }
    },
    [supabase, userId]
  );

  const refreshInboxRef = useRef(refreshInbox);
  const markConversationReadRef = useRef(markConversationRead);
  const resolveConversationKeyRef = useRef(resolveConversationKey);
  const redecryptVisibleMessagesRef = useRef(redecryptVisibleMessages);
  const scrollToBottomRef = useRef(scrollToBottom);
  const loadMessagesRef = useRef(loadMessages);
  const refreshInboxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  refreshInboxRef.current = refreshInbox;
  markConversationReadRef.current = markConversationRead;
  resolveConversationKeyRef.current = resolveConversationKey;
  redecryptVisibleMessagesRef.current = redecryptVisibleMessages;
  scrollToBottomRef.current = scrollToBottom;
  loadMessagesRef.current = loadMessages;

  const scheduleRefreshInbox = useCallback(() => {
    if (refreshInboxTimerRef.current) {
      clearTimeout(refreshInboxTimerRef.current);
    }
    refreshInboxTimerRef.current = setTimeout(() => {
      void refreshInboxRef.current();
    }, 300);
  }, []);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    async function init() {
      const prepared = await prepareMessagingKeys(userId, supabase);
      privateKeyRef.current = prepared.privateKey;

      if (prepared.needsPinRestore) {
        setRestorePinLength(prepared.pinLength);
        setLegacyPasswordBackup(prepared.legacyPasswordBackup);
        setShowKeysResetNotice(true);
        conversationKeysRef.current.clear();
      } else if (prepared.keysRegenerated) {
        keysRegeneratedRef.current = true;
        conversationKeysRef.current.clear();
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("presence_status, messaging_pin_length")
        .eq("id", userId)
        .maybeSingle();

      setPresence((profile?.presence_status as PresenceStatus) || "online");

      if (!profile?.messaging_pin_length && prepared.privateKey && !prepared.needsPinRestore) {
        setNeedsPinSetup(true);
        setShowPinSetupPanel(true);
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          presence_status: "online",
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (!error) {
        setPresence("online");
      }

      await refreshInboxRef.current();
      await redecryptVisibleMessagesRef.current();
    }

    void init();
  }, [supabase, userId]);

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
          const friendId = activeFriendRef.current;
          const convId = conversationRef.current;
          const panelOpen = openRef.current;

          const isForActiveFriend = !!friendId && message.sender_id === friendId;
          const isForActiveConversation =
            !!convId && message.conversation_id === convId;
          const shouldAppendToChat =
            panelOpen &&
            !!friendId &&
            (isForActiveFriend || (isMine && isForActiveConversation));

          if (shouldAppendToChat) {
            if (convId !== message.conversation_id) {
              setConversationId(message.conversation_id);
              conversationRef.current = message.conversation_id;
            }

            const conversationKey = await resolveConversationKeyRef.current(
              message.conversation_id,
              friendId
            );
            const uiMessage = await decryptDirectMessage(
            message,
            conversationKey,
            supabase,
            getDecryptOptions()
          );
            if (uiMessage.decryptedImageUrl) {
              blobUrlsRef.current.push(uiMessage.decryptedImageUrl);
            }

            setMessages((prev) =>
              prev.some((item) => item.id === uiMessage.id) ? prev : [...prev, uiMessage]
            );

            if (
              message.is_encrypted &&
              (!conversationKey || uiMessage.decryptedText === "🔒 Encrypted message")
            ) {
              setTimeout(() => void redecryptVisibleMessagesRef.current(), 400);
            }

            setTimeout(() => scrollToBottomRef.current(), 50);

            if (!isMine) {
              await markConversationReadRef.current(message.conversation_id, true);
            }
          } else if (!isMine) {
            playMessageSound();
          }

          scheduleRefreshInbox();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "friendships" },
        async (payload) => {
          const row = payload.new as {
            requester_id?: string;
            addressee_id?: string;
            status?: string;
          };
          if (row.requester_id !== userId && row.addressee_id !== userId) return;
          scheduleRefreshInbox();
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "friendships" },
        async (payload) => {
          const row = payload.old as { requester_id?: string; addressee_id?: string };
          if (row.requester_id !== userId && row.addressee_id !== userId) return;
          scheduleRefreshInbox();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const updated = payload.new as {
            id: string;
            presence_status?: PresenceStatus;
            encryption_public_key?: string | null;
          };

          if (updated.id === userId) {
            if (updated.presence_status) {
              setPresence(updated.presence_status);
            }
            return;
          }

          if (updated.encryption_public_key) {
            conversationKeysRef.current.clear();
          }

          setFriends((prev) =>
            prev.map((friend) =>
              friend.id === updated.id
                ? {
                    ...friend,
                    presence_status: updated.presence_status || friend.presence_status,
                    encryption_public_key:
                      updated.encryption_public_key ?? friend.encryption_public_key,
                  }
                : friend
            )
          );

          if (
            updated.encryption_public_key &&
            activeFriendRef.current === updated.id &&
            conversationRef.current
          ) {
            void loadMessagesRef.current(conversationRef.current, updated.id);
          }
        }
      )
      .subscribe();

    return () => {
      if (refreshInboxTimerRef.current) {
        clearTimeout(refreshInboxTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, scheduleRefreshInbox]);

  const prevOpenRef = useRef(false);
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;

    if (justOpened && activeFriendId && conversationId) {
      void loadMessagesRef.current(conversationId, activeFriendId);
    }
  }, [open, activeFriendId, conversationId]);

  useEffect(() => {
    function handleFriendsChanged() {
      void refreshInbox();
    }

    window.addEventListener(MESSENGER_FRIENDS_CHANGED, handleFriendsChanged);
    return () => window.removeEventListener(MESSENGER_FRIENDS_CHANGED, handleFriendsChanged);
  }, [refreshInbox]);

  useEffect(() => {
    if (open) {
      void refreshInbox();
    }
  }, [open, refreshInbox]);

  useEffect(() => {
    if (open && activeFriendId && conversationId) {
      scrollToBottom();
    }
  }, [open, activeFriendId, conversationId, messages.length, scrollToBottom]);

  useEffect(() => {
    if (!lightboxImageUrl) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setLightboxImageUrl(null);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [lightboxImageUrl]);

  const restoreKeysWithPin = useCallback(async () => {
    if (!restorePin.trim()) return;

    const validation = validateMessagingPin(
      restorePin,
      restorePinLength || undefined
    );
    if (!validation.valid) {
      setSendError(validation.error || "Invalid messaging PIN.");
      return;
    }

    setRestoringKeys(true);
    setSendError(null);

    const restored = await restoreMessagingKeysFromPin(
      userId,
      restorePin,
      supabase,
      restorePinLength
    );

    if (!restored) {
      setSendError("Could not restore keys. Check your messaging PIN and try again.");
      setRestoringKeys(false);
      return;
    }

    privateKeyRef.current = (
      await ensureUserEncryptionKeys(userId, supabase)
    ).privateKey;
    keysRegeneratedRef.current = false;
    setShowKeysResetNotice(false);
    setRestorePin("");
    conversationKeysRef.current.clear();

    if (conversationId && activeFriendId) {
      await loadMessages(conversationId, activeFriendId);
    }
    await refreshInbox();
    setRestoringKeys(false);
  }, [
    restorePin,
    restorePinLength,
    userId,
    supabase,
    conversationId,
    activeFriendId,
    loadMessages,
    refreshInbox,
  ]);

  const setupPinForMessaging = useCallback(async () => {
    const pinValidation = validateMessagingPin(setupPin, setupPinLength);
    if (!pinValidation.valid) {
      setSendError(pinValidation.error || "Invalid messaging PIN.");
      return;
    }

    if (setupPin !== confirmSetupPin) {
      setSendError("Messaging PINs do not match.");
      return;
    }

    setSettingUpPin(true);
    setSendError(null);

    try {
      await setupMessagingPin(userId, setupPin, setupPinLength, supabase);

      if (!privateKeyRef.current) {
        privateKeyRef.current = (
          await ensureUserEncryptionKeys(userId, supabase)
        ).privateKey;
      }

      setNeedsPinSetup(false);
      setShowPinSetupPanel(false);
      setLegacyPasswordBackup(false);
      setRestorePinLength(setupPinLength);
      setSetupPin("");
      setConfirmSetupPin("");
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : "Could not save messaging PIN."
      );
    }

    setSettingUpPin(false);
  }, [setupPin, confirmSetupPin, setupPinLength, userId, supabase]);

  const restoreKeysWithPassword = useCallback(async () => {
    if (!restorePassword.trim()) return;

    setRestoringKeys(true);
    setSendError(null);

    const restored = await restoreMessagingKeysFromPassword(
      userId,
      restorePassword,
      supabase
    );

    if (!restored) {
      setSendError("Could not restore keys. Check your login password and try again.");
      setRestoringKeys(false);
      return;
    }

    privateKeyRef.current = (
      await ensureUserEncryptionKeys(userId, supabase)
    ).privateKey;
    keysRegeneratedRef.current = false;
    setShowKeysResetNotice(false);
    setRestorePassword("");
    setNeedsPinSetup(true);
    setShowPinSetupPanel(true);
    conversationKeysRef.current.clear();

    if (conversationId && activeFriendId) {
      await loadMessages(conversationId, activeFriendId);
    }
    await refreshInbox();
    setRestoringKeys(false);
  }, [
    restorePassword,
    userId,
    supabase,
    conversationId,
    activeFriendId,
    loadMessages,
    refreshInbox,
  ]);

  return (
    <>
      {open && (
        <div
          className="fixed bottom-20 sm:bottom-24 right-2 sm:right-4 md:right-6 z-[90]
            w-[calc(100vw-1rem)] sm:w-[min(calc(100vw-2rem),400px)] md:w-[440px] lg:w-[500px] xl:w-[540px]
            h-[min(88dvh,620px)] sm:h-[min(80dvh,580px)] md:h-[min(82dvh,640px)] lg:h-[min(84dvh,700px)] xl:h-[min(86dvh,760px)]
            max-h-[calc(100dvh-5.5rem)]
            glass-card border border-slate-700/60 shadow-2xl flex flex-col overflow-hidden animate-fade-in"
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-700/50 bg-slate-900/80">
            <div className="min-w-0">
              <p className="font-semibold text-sm">Messages</p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3 text-green-400" />
                End-to-end encrypted
              </p>
            </div>
            <div className="flex items-center gap-2">
              {needsPinSetup && !showPinSetupPanel && (
                <button
                  type="button"
                  onClick={() => setShowPinSetupPanel(true)}
                  className="p-2 rounded-lg hover:bg-gold-500/15 text-gold-400"
                  aria-label="Set up messaging PIN"
                  title="Set up messaging PIN"
                >
                  <Shield className="w-4 h-4" />
                </button>
              )}
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

          {showPinSetupPanel && needsPinSetup && !showKeysResetNotice && (
            <div className="px-4 py-3 border-b border-gold-700/40 bg-gold-950/30 text-xs text-gold-100/90">
              <p className="font-medium text-gold-200">Set up your messaging PIN</p>
              <p className="mt-1 text-slate-400">
                Choose a {setupPinLength}-digit PIN to encrypt a backup of your message keys.
                If you clear browser data or switch devices, enter this PIN in Messages to restore
                your chat history. Your PIN is never stored on our servers.
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSetupPinLength(4);
                    setSetupPin("");
                    setConfirmSetupPin("");
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs border transition-colors ${
                    setupPinLength === 4
                      ? "border-gold-500 bg-gold-500/15 text-gold-300"
                      : "border-slate-700 text-slate-400"
                  }`}
                >
                  4 digits
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSetupPinLength(6);
                    setSetupPin("");
                    setConfirmSetupPin("");
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs border transition-colors ${
                    setupPinLength === 6
                      ? "border-gold-500 bg-gold-500/15 text-gold-300"
                      : "border-slate-700 text-slate-400"
                  }`}
                >
                  6 digits
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={setupPin}
                  onChange={(e) =>
                    setSetupPin(e.target.value.replace(/\D/g, "").slice(0, setupPinLength))
                  }
                  placeholder={`PIN (${setupPinLength} digits)`}
                  className="input-field py-2 text-sm tracking-[0.2em] text-center"
                  maxLength={setupPinLength}
                />
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={confirmSetupPin}
                  onChange={(e) =>
                    setConfirmSetupPin(
                      e.target.value.replace(/\D/g, "").slice(0, setupPinLength)
                    )
                  }
                  placeholder="Confirm PIN"
                  className="input-field py-2 text-sm tracking-[0.2em] text-center"
                  maxLength={setupPinLength}
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => void setupPinForMessaging()}
                  disabled={
                    settingUpPin ||
                    setupPin.length !== setupPinLength ||
                    confirmSetupPin.length !== setupPinLength
                  }
                  className="px-3 py-2 rounded-md bg-gold-600 text-slate-950 font-medium hover:bg-gold-500 disabled:opacity-50"
                >
                  {settingUpPin ? "Saving..." : "Save messaging PIN"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPinSetupPanel(false)}
                  disabled={settingUpPin}
                  className="px-2.5 py-2 rounded-md text-slate-400 hover:text-slate-200"
                >
                  Later
                </button>
              </div>
            </div>
          )}

          {showKeysResetNotice && (
            <div className="px-4 py-3 border-b border-amber-700/40 bg-amber-950/40 text-xs text-amber-100/90">
              {legacyPasswordBackup ? (
                <>
                  <p>
                    Browser data was cleared on this device. Enter your{" "}
                    <strong>login password</strong> to restore your encrypted message history
                    (legacy backup). New accounts use a messaging PIN instead.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <input
                      type="password"
                      value={restorePassword}
                      onChange={(e) => setRestorePassword(e.target.value)}
                      placeholder="Your login password"
                      className="input-field flex-1 py-2 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void restoreKeysWithPassword();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => void restoreKeysWithPassword()}
                      disabled={restoringKeys || !restorePassword.trim()}
                      className="px-3 py-2 rounded-md bg-gold-600 text-slate-950 font-medium hover:bg-gold-500 disabled:opacity-50"
                    >
                      {restoringKeys ? "Restoring..." : "Restore messages"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Browser data was cleared on this device. Enter your{" "}
                    <strong>{restorePinLength || 6}-digit messaging PIN</strong> to restore your
                    encrypted message history.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      value={restorePin}
                      onChange={(e) =>
                        setRestorePin(
                          e.target.value
                            .replace(/\D/g, "")
                            .slice(0, restorePinLength || 6)
                        )
                      }
                      placeholder={restorePinLength ? "•".repeat(restorePinLength) : "PIN"}
                      className="input-field flex-1 py-2 text-sm tracking-[0.25em] text-center"
                      maxLength={restorePinLength || 6}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void restoreKeysWithPin();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => void restoreKeysWithPin()}
                      disabled={
                        restoringKeys ||
                        (restorePinLength
                          ? restorePin.length !== restorePinLength
                          : restorePin.length !== 4 && restorePin.length !== 6)
                      }
                      className="px-3 py-2 rounded-md bg-gold-600 text-slate-950 font-medium hover:bg-gold-500 disabled:opacity-50"
                    >
                      {restoringKeys ? "Restoring..." : "Restore messages"}
                    </button>
                  </div>
                </>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowKeysResetNotice(false)}
                  className="px-2.5 py-1 rounded-md text-amber-200/70 hover:text-amber-100"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-1 min-h-0">
            <div
              className={`${activeFriend ? "hidden sm:flex" : "flex"} w-full sm:w-40 md:w-44 lg:w-48 border-r border-slate-700/50 flex-col min-h-0`}
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
                        setReplyingTo(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{activeFriend.display_name}</p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${presenceColor(activeFriend.presence_status)}`}
                          aria-hidden
                        />
                        <span>{presenceLabel(activeFriend.presence_status)}</span>
                        {!activeFriend.encryption_public_key &&
                          " · End-to-end lock when they open Messages"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={!conversationId || deletingHistory || messages.length === 0}
                      className="p-2 rounded-lg hover:bg-red-950/40 text-slate-400 hover:text-red-400 disabled:opacity-40 disabled:pointer-events-none"
                      aria-label="Delete chat history"
                      title="Delete chat history"
                    >
                      {deletingHistory ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {showDeleteConfirm && (
                    <div className="px-3 py-3 border-b border-red-900/40 bg-red-950/30">
                      <p className="text-xs text-red-200/90">
                        Permanently delete all messages with {activeFriend.display_name}? This
                        removes the chat for both of you and cannot be undone.
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => void deleteConversationHistory()}
                          disabled={deletingHistory}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-500 disabled:opacity-50"
                        >
                          {deletingHistory ? "Deleting..." : "Delete history"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={deletingHistory}
                          className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

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
                            <div className="relative group max-w-[min(85%,420px)]">
                              <div
                                className={`relative rounded-2xl px-3 py-2 text-sm ${
                                  isMine
                                    ? "bg-gold-500/20 border border-gold-500/30 text-slate-100"
                                    : "bg-slate-800/80 border border-slate-700/50 text-slate-200"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => setReplyingTo(message)}
                                  className="absolute top-1.5 right-1.5 p-1 rounded-md bg-slate-900/70 text-slate-400 hover:text-gold-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                  aria-label="Reply to message"
                                  title="Reply"
                                >
                                  <CornerDownRight className="w-3.5 h-3.5" />
                                </button>
                                {message.replyPreview && (
                                  <div
                                    className={`mb-2 pl-2 border-l-2 ${
                                      isMine ? "border-gold-400/60" : "border-slate-500"
                                    }`}
                                  >
                                    <p className="text-[11px] font-medium text-slate-300">
                                      {replyAuthorName(message.replyPreview.senderId)}
                                    </p>
                                    <p className="text-[11px] text-slate-400 line-clamp-2">
                                      {message.replyPreview.hasImage &&
                                      message.replyPreview.text === "Photo"
                                        ? "📷 Photo"
                                        : message.replyPreview.text}
                                    </p>
                                  </div>
                                )}
                                {message.decryptedImageUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setLightboxImageUrl(message.decryptedImageUrl!)}
                                    className="block mb-2 rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={message.decryptedImageUrl}
                                      alt="Shared photo — tap to enlarge"
                                      className="rounded-lg max-w-full max-h-48 object-cover hover:opacity-90 transition-opacity cursor-zoom-in"
                                    />
                                  </button>
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
                    className="border-t border-slate-700/50 p-3 space-y-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void sendMessage(messageInput);
                    }}
                  >
                    {replyingTo && (
                      <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/50">
                        <CornerDownRight className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0 border-l-2 border-gold-500/40 pl-2">
                          <p className="text-[11px] font-medium text-gold-300/90">
                            Replying to {replyAuthorName(replyingTo.sender_id)}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {replyingTo.decryptedImageUrl && !replyingTo.decryptedText?.trim()
                              ? "📷 Photo"
                              : replyingTo.decryptedText || "Message"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setReplyingTo(null)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 shrink-0"
                          aria-label="Cancel reply"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
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

                    <textarea
                      value={messageInput}
                      onChange={(e) => {
                        setMessageInput(e.target.value);
                        if (sendError) setSendError(null);
                      }}
                      placeholder="Write a message..."
                      rows={2}
                      className="input-field w-full min-h-[52px] max-h-32 py-2.5 text-sm resize-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendMessage(messageInput);
                        }
                      }}
                    />

                    {sendError && (
                      <p className="text-xs text-amber-400/90 px-1">{sendError}</p>
                    )}

                    <div className="flex items-center gap-2">
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
                      <div className="flex-1" />
                      <button
                        type="submit"
                        disabled={sending || (!messageInput.trim() && !uploadingImage)}
                        className="btn-primary px-4 py-2.5 shrink-0 inline-flex items-center gap-2"
                        aria-label="Send message"
                      >
                        {sending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span className="text-sm font-medium">Send</span>
                          </>
                        )}
                      </button>
                    </div>
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

      {lightboxImageUrl && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
          onClick={() => setLightboxImageUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImageUrl(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/80 text-slate-200 hover:text-white border border-slate-700"
            aria-label="Close photo preview"
          >
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImageUrl}
            alt="Enlarged shared photo"
            className="max-w-full max-h-[calc(100dvh-2rem)] object-contain rounded-lg"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
