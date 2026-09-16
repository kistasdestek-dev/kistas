import React, { useEffect, useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CinematicFooter } from '../../../shared/components/CinematicFooter';

export interface FaqScreenProps {
  onBack: () => void;
  onExplore: () => void;
  onOpenSupport: () => void;
  onOpenAbout?: () => void;
  onOpenPrivacy?: () => void;
  onOpenHowItWorks?: () => void;
  onOpenBlog?: () => void;
}

type FaqCategory = 'Tümü' | 'Keşfet' | 'Destek' | 'Proje' | 'Vitrin Kredisi' | 'Hesap';

interface FaqItem {
  category: Exclude<FaqCategory, 'Tümü'>;
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  { category: 'Keşfet', question: 'Projeler nerede görünür?', answer: 'Onaylanan projeler Göz At alanında kendi kategorisinde yer alır. İlk 30 gün Yeni Çıkanlar bölümünde de görünür.' },
  { category: 'Keşfet', question: 'Popüler sıralama nasıl oluşur?', answer: 'Popüler projeler, kullanıcılardan aldıkları kalıcı destek sayısına göre sıralanır.' },
  { category: 'Destek', question: 'Bir projeye nasıl destek veririm?', answer: 'Proje sayfasındaki Destekle butonuna dokunman yeterli. Verdiğin destek kalıcıdır ve geri alınamaz.' },
  { category: 'Destek', question: 'Aynı projeye tekrar destek verebilir miyim?', answer: 'Hayır. Her hesap bir projeye bir kez destek verebilir. Böylece sıralama gerçek topluluk ilgisini yansıtır.' },
  { category: 'Proje', question: 'Projemi nasıl yayınlarım?', answer: 'Lansman alanından proje bilgilerini ve görsellerini ekle. İnceleme tamamlandığında projen vitrinde yayına alınır.' },
  { category: 'Proje', question: 'Hangi projeler kabul edilir?', answer: 'Çalışan, yasalara uygun ve açıkça anlatılan dijital ürünler kabul edilir. Yanıltıcı veya eksik başvurular yayınlanmaz.' },
  { category: 'Vitrin Kredisi', question: 'Vitrin kredisi ne işe yarar?', answer: 'Vitrin kredisi projenin Sponsorlu Vitrin rotasyonuna katılmasını sağlar. Tek seferlik kullanılır; abonelik değildir.' },
  { category: 'Vitrin Kredisi', question: 'Sponsorlu projeler sürekli en üstte mi kalır?', answer: 'Hayır. Sponsorlu projeler saatlik eşit rotasyona girer. Tek bir proje vitrini sürekli kaplayamaz.' },
  { category: 'Hesap', question: 'Kıstas’ı kullanmak ücretli mi?', answer: 'Projeleri keşfetmek ve desteklemek ücretsizdir. Vitrin kredileri yalnızca isteğe bağlı sponsorlu görünürlük içindir.' },
  { category: 'Hesap', question: 'Hesabımla ilgili yardımı nasıl alırım?', answer: 'Bu sayfadaki yanıt yeterli değilse Ekibimize Yaz butonuyla destek görüşmesi başlatabilirsin.' },
];

const CATEGORIES: FaqCategory[] = ['Tümü', 'Keşfet', 'Destek', 'Proje', 'Vitrin Kredisi', 'Hesap'];
const STYLE_ID = 'kistas-faq-styles';
const STYLES = `
.kfaq-page{height:100%;overflow-x:hidden;overflow-y:auto;color:#25364E;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:radial-gradient(circle at 50% 4%,rgba(50,105,199,.13),transparent 29%),#F3F6FB}.kfaq-page *{box-sizing:border-box}.kfaq-wrap{width:min(980px,calc(100% - 40px));margin:0 auto}
.kfaq-hero{display:flex;flex-direction:column;align-items:center;padding:38px 0 40px;text-align:center}.kfaq-back{align-self:flex-start;display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 14px;border:1px solid rgba(50,105,199,.18);border-radius:12px;background:rgba(255,255,255,.78);color:#686474;font:700 12px/1 inherit;cursor:pointer}.kfaq-kicker{margin:48px 0 15px;padding:8px 12px;border:1px solid rgba(50,105,199,.16);border-radius:999px;background:rgba(255,255,255,.76);color:#3269C7;font-size:10px;font-weight:700;letter-spacing:.16em}.kfaq-title{max-width:760px;margin:0;font-size:clamp(50px,7vw,82px);line-height:.98;font-weight:750;letter-spacing:-.05em}.kfaq-title span{color:#3269C7}.kfaq-lead{max-width:610px;margin:20px auto 0;color:#5F6877;font-size:17px;line-height:1.6}
.kfaq-search{position:relative;display:block;width:min(650px,100%);margin-top:30px}.kfaq-search-icon{position:absolute;z-index:1;top:50%;left:18px;display:grid;place-items:center;transform:translateY(-50%);color:#3269C7;pointer-events:none}.kfaq-search input{width:100%;height:58px;padding:0 48px;border:1px solid rgba(50,105,199,.2);border-radius:17px;outline:none;background:#FFF;color:#25364E;font:600 14px/1 inherit;box-shadow:0 16px 38px rgba(37,54,78,.07)}.kfaq-search input:focus{border-color:#3269C7;box-shadow:0 0 0 4px rgba(50,105,199,.1)}.kfaq-search-clear{position:absolute;top:50%;right:10px;display:grid;width:38px;height:38px;place-items:center;transform:translateY(-50%);border:0;border-radius:12px;background:#EEF4FD;color:#3269C7;cursor:pointer}
.kfaq-content{padding:18px 0 84px}.kfaq-categories{display:flex;gap:8px;overflow-x:auto;padding:0 0 18px;scrollbar-width:none}.kfaq-categories::-webkit-scrollbar{display:none}.kfaq-category{flex:0 0 auto;min-height:38px;padding:0 15px;border:1px solid rgba(50,105,199,.15);border-radius:999px;background:rgba(255,255,255,.8);color:#68758A;font:700 11px/1 inherit;cursor:pointer}.kfaq-category.active{border-color:#3269C7;background:#3269C7;color:#FFF;box-shadow:0 9px 22px rgba(50,105,199,.2)}
.kfaq-list{display:grid;gap:10px}.kfaq-item{overflow:hidden;border:1px solid rgba(50,105,199,.14);border-radius:18px;background:rgba(255,255,255,.9);box-shadow:0 13px 30px rgba(37,54,78,.045)}.kfaq-question{display:flex;width:100%;align-items:center;justify-content:space-between;gap:18px;padding:21px 22px;border:0;background:transparent;color:#25364E;font:700 15px/1.4 inherit;text-align:left;cursor:pointer}.kfaq-question-icon{display:grid;width:32px;height:32px;flex:0 0 32px;place-items:center;border-radius:10px;background:#EEF4FD;color:#3269C7;transition:transform .2s ease}.kfaq-item.open .kfaq-question-icon{transform:rotate(45deg)}.kfaq-answer{margin:0;padding:0 66px 22px 22px;color:#5F6877;font-size:13px;line-height:1.7}.kfaq-empty{padding:42px 20px;border:1px dashed rgba(50,105,199,.25);border-radius:18px;color:#68758A;text-align:center}
.kfaq-help{display:grid;grid-template-columns:1fr auto;align-items:center;gap:28px;margin-top:42px;padding:32px;border-radius:22px;background:linear-gradient(135deg,#25364E,#1D4479);color:#FFF;box-shadow:0 26px 54px -22px rgba(37,54,78,.5)}.kfaq-help h2{margin:0;font-size:27px;letter-spacing:-.03em}.kfaq-help p{margin:8px 0 0;color:rgba(255,255,255,.76);font-size:13px;line-height:1.6}.kfaq-help-action{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:50px;padding:0 20px;border:0;border-radius:14px;background:#FFF;color:#25364E;font:700 12px/1 inherit;white-space:nowrap;cursor:pointer}
@media(max-width:640px){.kfaq-wrap{width:calc(100% - 32px)}.kfaq-hero{padding-top:22px}.kfaq-kicker{margin-top:46px}.kfaq-title{font-size:48px}.kfaq-lead{font-size:15px}.kfaq-content{padding-top:8px}.kfaq-question{padding:19px 18px;font-size:14px}.kfaq-answer{padding:0 18px 20px}.kfaq-help{grid-template-columns:1fr;padding:25px 22px}.kfaq-help-action{width:100%}}
@media(prefers-reduced-motion:reduce){.kfaq-question-icon{transition:none}}
`;

const normalize = (value: string) => value.toLocaleLowerCase('tr-TR').trim();

export const FaqScreen: React.FC<FaqScreenProps> = ({ onBack, onExplore, onOpenSupport, onOpenAbout, onOpenPrivacy, onOpenHowItWorks, onOpenBlog }) => {
  const [category, setCategory] = useState<FaqCategory>('Tümü');
  const [query, setQuery] = useState('');
  const [openQuestion, setOpenQuestion] = useState<string | null>(FAQS[0].question);

  useEffect(() => {
    const style = document.getElementById(STYLE_ID) ?? document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLES;
    if (!style.parentNode) document.head.appendChild(style);
  }, []);

  const visibleFaqs = useMemo(() => {
    const term = normalize(query);
    return FAQS.filter((item) => (category === 'Tümü' || item.category === category)
      && (!term || normalize(`${item.question} ${item.answer} ${item.category}`).includes(term)));
  }, [category, query]);

  return (
    <main className="kfaq-page" aria-label="Sıkça Sorulan Sorular">
      <section className="kfaq-hero kfaq-wrap">
        <button className="kfaq-back" type="button" onClick={onBack}><Ionicons name="arrow-back" size={16} /> Geri dön</button>
        <p className="kfaq-kicker">MERAK ETTİĞİN HER ŞEY</p>
        <h1 className="kfaq-title">Sorularının cevabı <span>burada.</span></h1>
        <p className="kfaq-lead">Kıstas'ı keşfetmek, destek vermek veya projenle büyümek için bilmen gerekenler.</p>
        <label className="kfaq-search">
          <span className="kfaq-search-icon"><Ionicons name="search-outline" size={20} /></span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Bir soru ara" aria-label="SSS içinde ara" />
          {query ? <button className="kfaq-search-clear" type="button" onClick={() => setQuery('')} aria-label="Aramayı temizle"><Ionicons name="close" size={18} /></button> : null}
        </label>
      </section>

      <section className="kfaq-content kfaq-wrap">
        <div className="kfaq-categories" aria-label="SSS kategorileri">
          {CATEGORIES.map((item) => <button className={`kfaq-category${category === item ? ' active' : ''}`} type="button" onClick={() => setCategory(item)} key={item}>{item}</button>)}
        </div>
        <div className="kfaq-list">
          {visibleFaqs.map((item) => {
            const isOpen = openQuestion === item.question;
            return (
              <article className={`kfaq-item${isOpen ? ' open' : ''}`} key={item.question}>
                <button className="kfaq-question" type="button" aria-expanded={isOpen} onClick={() => setOpenQuestion(isOpen ? null : item.question)}>
                  <span>{item.question}</span><span className="kfaq-question-icon"><Ionicons name="add" size={19} /></span>
                </button>
                {isOpen ? <p className="kfaq-answer">{item.answer}</p> : null}
              </article>
            );
          })}
          {!visibleFaqs.length ? <div className="kfaq-empty">Bu aramayla eşleşen bir soru bulamadık.</div> : null}
        </div>

        <aside className="kfaq-help">
          <div><h2>Yanıtını bulamadın mı?</h2><p>Ekibimize yaz. Hesabın veya projen için birlikte çözüm bulalım.</p></div>
          <button className="kfaq-help-action" type="button" onClick={onOpenSupport}><Ionicons name="chatbubble-ellipses-outline" size={18} /> Ekibimize Yaz</button>
        </aside>
        <button className="kfaq-back" type="button" onClick={onExplore} style={{ marginTop: 22 }}><Ionicons name="compass-outline" size={16} /> Projeleri Keşfet</button>
      </section>

      <CinematicFooter compact onOpenAbout={onOpenAbout} onOpenPrivacy={onOpenPrivacy} onOpenHowItWorks={onOpenHowItWorks} onOpenBlog={onOpenBlog} />
    </main>
  );
};
