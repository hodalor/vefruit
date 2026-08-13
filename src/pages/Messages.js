import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useUserAuth } from '../auth/UserAuthContext';
import { useSellerAuth } from '../auth/SellerAuthContext';
import { buildThreadKey, getChatEventName, loadChatMessages, sendChatMessage } from '../chat/chatService';
import useProducts from '../products/useProducts';
import LoadingButton from '../components/LoadingButton';
import { useToast } from '../toast/ToastContext';

function Messages() {
  const { current, users } = useUserAuth();
  const { current: farmerCurrent, sellers } = useSellerAuth();
  const { showToast } = useToast();
  const products = useProducts();
  const [params] = useSearchParams();
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const activeUser = farmerCurrent || current;
  const activeRole = farmerCurrent ? 'farmer' : (current?.role || 'buyer');
  const otherUserId = params.get('otherUserId') || '';
  const productId = params.get('productId') || '';
  const buyerIdParam = params.get('buyerId') || '';
  const farmerIdParam = params.get('farmerId') || '';
  const product = products.find((entry) => String(entry.id) === String(productId));
  const usersMap = useMemo(() => new Map(users.map((entry) => [String(entry.id), entry])), [users]);
  const sellersMap = useMemo(() => new Map(sellers.map((entry) => [String(entry.id), entry])), [sellers]);
  const buyerId = activeRole === 'buyer' ? String(activeUser?.id || '') : buyerIdParam;
  const farmerId = activeRole === 'farmer'
    ? String(activeUser?.id || '')
    : (farmerIdParam || otherUserId || String(product?.sellerId || ''));
  const threadKey = params.get('threadKey') || buildThreadKey({ buyerId, farmerId, productId });

  const conversationUsers = useMemo(() => ({
    buyer: usersMap.get(String(buyerId || '')),
    farmer: sellersMap.get(String(farmerId || '')),
    admin: current?.role === 'admin' ? current : null,
  }), [buyerId, current, farmerId, sellersMap, usersMap]);

  const conversations = useMemo(() => {
    const map = new Map();
    messages.forEach((message) => {
      const key = message.threadKey || [
        'direct',
        ...[String(message.senderId || ''), String(message.recipientId || '')].sort(),
        String(message.productId || 'general'),
      ].join(':');
      if (!map.has(key) || new Date(map.get(key).message.createdAt) < new Date(message.createdAt)) {
        const participants = Array.isArray(message.participantIds) ? message.participantIds : [message.senderId, message.recipientId];
        map.set(key, { key, message, participants });
      }
    });
    return Array.from(map.values()).map((entry) => {
      const otherParticipants = entry.participants.filter((id) => String(id) !== String(activeUser?.id));
      const buyerParticipant = entry.participants.find((id) => usersMap.get(String(id))?.role === 'buyer');
      const farmerParticipant = entry.participants.find((id) => sellersMap.has(String(id)));
      const title = otherParticipants.map((id) => {
        const user = sellersMap.get(String(id)) || usersMap.get(String(id));
        return user?.name || `User ${String(id).slice(-6)}`;
      }).join(', ');
      const buyer = usersMap.get(String(buyerParticipant || ''));
      const farmer = sellersMap.get(String(farmerParticipant || ''));
      return {
        threadKey: entry.key,
        message: entry.message,
        participants: entry.participants,
        buyerId: buyerParticipant ? String(buyerParticipant) : '',
        farmerId: farmerParticipant ? String(farmerParticipant) : '',
        title: title || 'Conversation',
        hasVerifiedParticipant: !!buyer?.isVerified || !!farmer?.isVerified,
      };
    });
  }, [activeUser?.id, messages, sellersMap, usersMap]);

  useEffect(() => {
    if (!activeUser?.id) return undefined;
    const sync = () => loadChatMessages({
      currentUserId: activeUser.id,
      otherUserId,
      productId,
      threadKey,
      join: activeRole === 'admin' && !!threadKey,
    }).then(setMessages).catch(() => setMessages([]));
    sync();
    window.addEventListener(getChatEventName(), sync);
    return () => window.removeEventListener(getChatEventName(), sync);
  }, [activeRole, activeUser?.id, otherUserId, productId, threadKey]);

  const conversationTitle = useMemo(() => {
    if (threadKey && conversationUsers.buyer && conversationUsers.farmer) {
      return `${conversationUsers.buyer.name} & ${conversationUsers.farmer.name}`;
    }
    const titleFallback = conversations.find((conversation) => conversation.threadKey === threadKey)?.title;
    return titleFallback || conversationUsers.farmer?.name || 'Conversation';
  }, [conversations, conversationUsers.buyer, conversationUsers.farmer, threadKey]);

  const submit = async (event) => {
    event.preventDefault();
    const partnerId = activeRole === 'farmer' ? buyerId : (farmerId || otherUserId);
    if (!activeUser?.id || !partnerId || !body.trim() || sending) return;
    setError('');
    setSending(true);
    try {
      await sendChatMessage({
        senderId: activeUser.id,
        senderRole: activeRole,
        recipientId: partnerId,
        recipientRole: activeRole === 'farmer' ? 'buyer' : 'farmer',
        productId: productId || product?.id || null,
        threadKey,
        participantIds: [buyerId, farmerId, activeRole === 'admin' ? activeUser.id : null],
        body,
      });
      setBody('');
      showToast('Message sent.');
    } catch (err) {
      setError(err.message || 'Unable to send message');
      showToast(err.message || 'Unable to send message', { type: 'error' });
    } finally {
      setSending(false);
    }
  };

  if (!activeUser) {
    return (
      <main className="Container">
        <h2>Messages</h2>
        <p>Please log in as a buyer or farmer to use chat.</p>
      </main>
    );
  }

  return (
    <main className="Container">
      <div className="AdminHeading" style={{ marginBottom: '1rem' }}>
        <div>
          <h1>Messages</h1>
          <p className="AdminSubtle">Buyer and farmer messages refresh in realtime, admin can stay in joined threads, and both sides can see deal context before closing a sale.</p>
        </div>
      </div>

      <section className="ChatShell Card ChatShellClean">
        <aside className="ChatSidebar">
          <div className="ChatSidebarHeader">
            <h2 className="SectionTitle" style={{ marginBottom: 0 }}>Chats</h2>
            <p className="AdminSubtle">Open a conversation and reply in realtime.</p>
          </div>

          {conversations.length === 0 ? (
            <div className="ChatEmptyState">
              <p className="Muted">Open chat from a product or order to start a conversation.</p>
            </div>
          ) : (
            <div className="ChatConversationList">
              {conversations.map((conversation) => {
                const active = conversation.threadKey === threadKey;
                const targetUrl = `/messages?threadKey=${encodeURIComponent(conversation.threadKey)}${conversation.buyerId ? `&buyerId=${encodeURIComponent(conversation.buyerId)}` : ''}${conversation.farmerId ? `&farmerId=${encodeURIComponent(conversation.farmerId)}` : ''}${conversation.message.productId ? `&productId=${encodeURIComponent(conversation.message.productId)}` : ''}`;
                return (
                  <Link
                    className={`ChatConversationCard${active ? ' active' : ''}`}
                    key={conversation.threadKey}
                    to={targetUrl}
                  >
                    <div className="ChatConversationAvatar">
                      {conversation.title.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="ChatConversationContent">
                      <div className="ChatConversationTop">
                        <strong>
                          {conversation.title}
                          {conversation.hasVerifiedParticipant ? <VerifiedBadge /> : null}
                        </strong>
                        <span>{new Date(conversation.message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                      </div>
                      <div className="ChatConversationPreview">{conversation.message.body}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </aside>

        <div className="ChatMain">
          <div className="ChatHeader">
            <div className="ChatHeaderAvatar">
              {conversationTitle.slice(0, 1).toUpperCase()}
            </div>
            <div className="ChatHeaderContent">
              <h2 className="SectionTitle" style={{ marginBottom: '0.2rem' }}>{conversationTitle}</h2>
              <div className="ChatHeaderMeta">
                {product && <span>Product: {product.name}</span>}
                {conversationUsers.buyer && (
                  <span>
                    Buyer: {conversationUsers.buyer.name}
                    {conversationUsers.buyer.isVerified ? <VerifiedBadge /> : null}
                  </span>
                )}
                {conversationUsers.farmer && (
                  <span>
                    Farmer: {conversationUsers.farmer.name}
                    {conversationUsers.farmer.isVerified ? <VerifiedBadge /> : null}
                  </span>
                )}
                {activeRole === 'admin' && threadKey ? <span>Admin joined this thread</span> : null}
              </div>
            </div>
          </div>

          {!threadKey && !otherUserId ? (
            <div className="ChatWelcome">
              <h3>Select a conversation</h3>
              <p className="Muted">Choose a chat from the left to view messages and reply.</p>
            </div>
          ) : (
            <>
              <div className="ChatMessages">
                {messages.length === 0 ? (
                  <div className="ChatWelcome">
                    <h3>No messages yet</h3>
                    <p className="Muted">Start the conversation with your first message.</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isMine = String(message.senderId) === String(activeUser.id);
                    const seller = sellersMap.get(String(message.senderId));
                    const buyer = usersMap.get(String(message.senderId));
                    const sender = seller || buyer;
                    return (
                      <div key={message.id} className={`ChatBubbleRow${isMine ? ' mine' : ''}`}>
                        <div className={`ChatBubble${isMine ? ' mine' : ''}`}>
                          <div className="ChatBubbleSender">
                            {sender?.name || message.senderRole}
                            {sender?.isVerified ? <VerifiedBadge /> : null}
                            {' '}({message.senderRole})
                          </div>
                          <div className="ChatBubbleBody">{message.body}</div>
                          <div className="ChatBubbleTime">
                            {new Date(message.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={submit} className="ChatComposer">
                <label className="ChatComposerField">
                  <span className="ChatComposerLabel">Message</span>
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows="3"
                    placeholder="Type your message..."
                  />
                </label>
                <div className="ChatComposerActions">
                  {error && <span style={{ color: 'crimson' }}>{error}</span>}
                  <LoadingButton className="Btn" type="submit" loading={sending} loadingText="Sending...">Send Message</LoadingButton>
                </div>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function VerifiedBadge() {
  return <span className="VerifiedBadge" title="Verified account">✓</span>;
}

export default Messages;
