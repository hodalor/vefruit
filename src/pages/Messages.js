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
  const conversationUsers = useMemo(() => {
    return {
      buyer: usersMap.get(String(buyerId || '')),
      farmer: sellersMap.get(String(farmerId || '')),
      admin: current?.role === 'admin' ? current : null,
    };
  }, [buyerId, current, farmerId, sellersMap, usersMap]);
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
      return {
        threadKey: entry.key,
        message: entry.message,
        participants: entry.participants,
        buyerId: buyerParticipant ? String(buyerParticipant) : '',
        farmerId: farmerParticipant ? String(farmerParticipant) : '',
        title: title || 'Conversation',
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
    }).then(setMessages).catch(() => setMessages([]));
    sync();
    window.addEventListener(getChatEventName(), sync);
    return () => window.removeEventListener(getChatEventName(), sync);
  }, [activeUser?.id, otherUserId, productId, threadKey]);

  const conversationTitle = useMemo(() => {
    if (threadKey && conversationUsers.buyer && conversationUsers.farmer) {
      return `${conversationUsers.buyer.name} & ${conversationUsers.farmer.name}`;
    }
    const titleFallback = conversations.find((conversation) => conversation.threadKey === threadKey)?.title;
    return titleFallback || conversationUsers.farmer?.name || 'Conversation';
  }, [conversations, conversationUsers.buyer, conversationUsers.farmer, threadKey]);

  const submit = async (e) => {
    e.preventDefault();
    const partnerId = activeRole === 'farmer'
      ? buyerId
      : (farmerId || otherUserId);
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
          <p className="AdminSubtle">Buyer and farmer messages refresh in realtime, and admin can also join the same thread when support is needed.</p>
        </div>
      </div>

      <section className="Card">
        <div className="CardBody">
          <div className="AdminSectionHeader">
            <div>
              <h2 className="SectionTitle">{conversationTitle}</h2>
              {product && <p className="AdminSubtle">Product: {product.name}</p>}
              {conversationUsers.buyer && <p className="AdminSubtle">Buyer: {conversationUsers.buyer.name}</p>}
              {conversationUsers.farmer && <p className="AdminSubtle">Farmer: {conversationUsers.farmer.name}</p>}
            </div>
          </div>

          {!threadKey && !otherUserId ? (
            conversations.length === 0 ? (
              <p className="Muted">Open chat from a product page to start a conversation with a farmer.</p>
            ) : (
              <div className="Grid">
                {conversations.map((conversation) => (
                  <Link
                    className="Card"
                    key={conversation.threadKey}
                    to={`/messages?threadKey=${encodeURIComponent(conversation.threadKey)}${conversation.buyerId ? `&buyerId=${encodeURIComponent(conversation.buyerId)}` : ''}${conversation.farmerId ? `&farmerId=${encodeURIComponent(conversation.farmerId)}` : ''}${conversation.message.productId ? `&productId=${encodeURIComponent(conversation.message.productId)}` : ''}`}
                  >
                    <div className="CardBody">
                      <strong>{conversation.title}</strong>
                      <div className="Muted">{conversation.message.body}</div>
                      <div className="Muted" style={{ marginTop: '0.45rem' }}>{new Date(conversation.message.createdAt).toLocaleString()}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : (
            <>
              <div className="AdminStack" style={{ marginBottom: '1rem' }}>
                {messages.length === 0 ? (
                  <p className="Muted">No messages yet.</p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className="Card"
                      style={{
                        marginLeft: String(message.senderId) === String(activeUser.id) ? 'auto' : 0,
                        maxWidth: '720px',
                        background: String(message.senderId) === String(activeUser.id) ? '#eff6ff' : '#ffffff',
                      }}
                    >
                      <div className="CardBody">
                        <div className="Muted">
                          {(sellersMap.get(String(message.senderId)) || usersMap.get(String(message.senderId)))?.name || message.senderRole}
                          {' '}({message.senderRole})
                        </div>
                        <div>{message.body}</div>
                        <div className="Muted" style={{ marginTop: '0.45rem' }}>{new Date(message.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={submit} className="AdminFormGrid">
                <label className="AdminFieldWide">
                  Message
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} rows="4" placeholder="Type your message to the farmer or buyer." />
                </label>
                <div className="AdminFieldWide AdminButtonRow">
                  <LoadingButton className="Btn" type="submit" loading={sending} loadingText="Sending...">Send Message</LoadingButton>
                  {error && <span style={{ color: 'crimson' }}>{error}</span>}
                </div>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default Messages;
