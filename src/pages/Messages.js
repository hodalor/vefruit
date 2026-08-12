import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useUserAuth } from '../auth/UserAuthContext';
import { useSellerAuth } from '../auth/SellerAuthContext';
import { getChatEventName, loadChatMessages, sendChatMessage } from '../chat/chatService';
import useProducts from '../products/useProducts';

function Messages() {
  const { current } = useUserAuth();
  const { current: farmerCurrent, sellers } = useSellerAuth();
  const products = useProducts();
  const [params] = useSearchParams();
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  const activeUser = farmerCurrent || current;
  const activeRole = farmerCurrent ? 'farmer' : 'buyer';
  const otherUserId = params.get('otherUserId') || '';
  const productId = params.get('productId') || '';
  const product = products.find((entry) => String(entry.id) === String(productId));
  const farmer = sellers.find((entry) => String(entry.id) === String(otherUserId)) || sellers.find((entry) => String(entry.id) === String(product?.sellerId));
  const conversations = useMemo(() => {
    const map = new Map();
    messages.forEach((message) => {
      const partnerId = String(message.senderId) === String(activeUser?.id) ? String(message.recipientId) : String(message.senderId);
      if (!map.has(partnerId)) {
        map.set(partnerId, message);
      } else if (new Date(map.get(partnerId).createdAt) < new Date(message.createdAt)) {
        map.set(partnerId, message);
      }
    });
    return Array.from(map.entries()).map(([partnerId, message]) => ({
      partnerId,
      message,
      farmer: sellers.find((entry) => String(entry.id) === partnerId),
    }));
  }, [activeUser?.id, messages, sellers]);

  useEffect(() => {
    if (!activeUser?.id) return undefined;
    const sync = () => loadChatMessages({
      currentUserId: activeUser.id,
      otherUserId: otherUserId || farmer?.id,
      productId,
    }).then(setMessages).catch(() => setMessages([]));
    sync();
    window.addEventListener(getChatEventName(), sync);
    return () => window.removeEventListener(getChatEventName(), sync);
  }, [activeUser?.id, farmer?.id, otherUserId, productId]);

  const conversationTitle = useMemo(() => {
    if (farmer?.name) return farmer.name;
    return 'Conversation';
  }, [farmer?.name]);

  const submit = async (e) => {
    e.preventDefault();
    if (!activeUser?.id || !(otherUserId || farmer?.id) || !body.trim()) return;
    setError('');
    try {
      await sendChatMessage({
        senderId: activeUser.id,
        senderRole: activeRole,
        recipientId: otherUserId || farmer?.id,
        recipientRole: activeRole === 'farmer' ? 'buyer' : 'farmer',
        productId: productId || product?.id || null,
        body,
      });
      setBody('');
    } catch (err) {
      setError(err.message || 'Unable to send message');
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
          <p className="AdminSubtle">Chat directly between buyer and farmer. New messages refresh in realtime.</p>
        </div>
      </div>

      <section className="Card">
        <div className="CardBody">
          <div className="AdminSectionHeader">
            <div>
              <h2 className="SectionTitle">{conversationTitle}</h2>
              {product && <p className="AdminSubtle">Product: {product.name}</p>}
            </div>
          </div>

          {!otherUserId && !farmer?.id ? (
            conversations.length === 0 ? (
              <p className="Muted">Open chat from a product page to start a conversation with a farmer.</p>
            ) : (
              <div className="Grid">
                {conversations.map((conversation) => (
                  <Link className="Card" key={conversation.partnerId} to={`/messages?otherUserId=${encodeURIComponent(conversation.partnerId)}`}>
                    <div className="CardBody">
                      <strong>{conversation.farmer?.name || `User ${conversation.partnerId.slice(-6)}`}</strong>
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
                        <div className="Muted">{message.senderRole}</div>
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
                  <button className="Btn" type="submit">Send Message</button>
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
