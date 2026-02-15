import { useMemo, useState } from 'react';
import { addHeroSlide, deleteHeroSlide, loadHeroSlides, updateHeroSlide, reorderHeroSlides } from '../hero/heroService';

function Admin() {
  const [slides, setSlides] = useState(() => loadHeroSlides());
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const refresh = () => setSlides(loadHeroSlides());

  const addUrl = () => {
    if (!imageUrl) return;
    addHeroSlide({ title: title || 'Banner', image: imageUrl, cta: { text: 'Shop', href: '/' } });
    setTitle('');
    setImageUrl('');
    refresh();
  };

  const toDataUrls = async (fileList) => {
    const files = Array.from(fileList || []).slice(0, 5);
    const readers = files.map((f) => new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error('read'));
      r.readAsDataURL(f);
    }));
    try {
      const urls = await Promise.all(readers);
      return urls;
    } catch {
      return [];
    }
  };

  const uploadImages = async (files) => {
    const urls = await toDataUrls(files);
    urls.forEach((u) => addHeroSlide({ title: title || 'Banner', image: u, cta: { text: 'Shop', href: '/' } }));
    setTitle('');
    refresh();
  };

  const remove = (id) => { deleteHeroSlide(id); refresh(); };
  const moveUp = (id) => { const ids = slides.map((s) => s.id); const i = ids.indexOf(id); if (i > 0) { [ids[i-1], ids[i]] = [ids[i], ids[i-1]]; reorderHeroSlides(ids); refresh(); } };
  const moveDown = (id) => { const ids = slides.map((s) => s.id); const i = ids.indexOf(id); if (i >= 0 && i < ids.length-1) { [ids[i+1], ids[i]] = [ids[i], ids[i+1]]; reorderHeroSlides(ids); refresh(); } };

  return (
    <main className="Container">
      <h2>Admin Dashboard</h2>
      <section className="Card" style={{ marginBottom: '1rem' }}>
        <div className="CardBody">
          <h3 style={{ marginTop: 0 }}>Hero Slides</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(220px,1fr))', gap: '0.75rem' }}>
            <label>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label>
              Image URL
              <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            </label>
            <div style={{ gridColumn: '1 / span 2', display: 'flex', gap: '0.5rem' }}>
              <button className="Btn" onClick={addUrl}>Add From URL</button>
              <label className="BtnOutline" style={{ display: 'inline-block' }}>
                Upload Images
                <input type="file" accept="image/*" multiple onChange={(e) => uploadImages(e.target.files)} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        </div>
      </section>
      {slides.length === 0 ? (
        <p className="Muted">No slides yet.</p>
      ) : (
        <div className="Grid">
          {slides.map((s) => (
            <div className="Card" key={s.id}>
              <img src={s.image} alt={s.title} onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x300?text=Slide'; }} />
              <div className="CardBody">
                <h3>{s.title}</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="BtnOutline" onClick={() => moveUp(s.id)}>Up</button>
                  <button className="BtnOutline" onClick={() => moveDown(s.id)}>Down</button>
                  <button className="BtnDanger" onClick={() => remove(s.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default Admin;
