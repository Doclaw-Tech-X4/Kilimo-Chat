import React from 'react';
import { ArrowUpRight, BarChart3, Check, CloudSun, Download, Leaf, Menu, MessageCircle, Play, ScanLine, ShieldCheck, Smartphone, Sprout, Star, Users, X } from 'lucide-react';

const featureCards = [
    { icon: MessageCircle, tone: 'mint', title: 'Ask an expert, anytime', text: 'Get practical crop, pest, soil and planting advice in clear English or Swahili.' },
    { icon: ScanLine, tone: 'sun', title: 'See what is wrong', text: 'Share a crop photo and get an agronomist-style explanation with next steps.' },
    { icon: BarChart3, tone: 'blue', title: 'Know your market', text: 'Search current crop prices, market signals and verified dealer contacts.' },
    { icon: CloudSun, tone: 'peach', title: 'Plan around weather', text: 'Turn local weather and seasonal patterns into better farming decisions.' },
];

const steps = [
    ['01', 'Ask naturally', 'Type or speak in the language that feels easiest.'],
    ['02', 'Add context', 'Share a photo, location or crop detail when you need a sharper answer.'],
    ['03', 'Take action', 'Use simple recommendations you can apply on your farm today.'],
];

const MarketingHome = () => {
    const [menuOpen, setMenuOpen] = React.useState(false);

    return (
        <main className="marketing-site">
            <nav className="marketing-nav">
                <a href="#top" className="marketing-brand">
                    <span className="brand-icon"><Sprout size={21} /></span>
                    <span>Kilimo<span>Chat</span></span>
                </a>
                <div className={`marketing-links ${menuOpen ? 'is-open' : ''}`}>
                    <a href="#why">Why KilimoChat</a>
                    <a href="#how">How it works</a>
                    <a href="#access">Get the app</a>
                    <a href="#whatsapp">WhatsApp</a>
                </div>
                <div className="nav-actions">
                    <a className="nav-login" href="/login">Sign in</a>
                    <a className="nav-cta" href="#access">Start free <ArrowUpRight size={16} /></a>
                    <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
                        {menuOpen ? <X size={21} /> : <Menu size={21} />}
                    </button>
                </div>
            </nav>

            <section className="hero-section" id="top">
                <div className="hero-copy">
                    <div className="eyebrow"><span className="eyebrow-dot" /> Built for the people who feed Kenya</div>
                    <h1>Better decisions.<br /><em>Stronger harvests.</em></h1>
                    <p className="hero-lede">KilimoChat puts a trusted farming companion in every farmer&apos;s pocket, from the first seed to the day you sell.</p>
                    <div className="hero-actions">
                        <a className="primary-button" href="#access">Bring KilimoChat home <ArrowUpRight size={18} /></a>
                        <a className="text-button" href="#how"><span className="play-icon"><Play size={13} fill="currentColor" /></span> See how it works</a>
                    </div>
                    <div className="hero-proof"><div className="avatar-stack"><span>G</span><span>M</span><span>A</span><span>+</span></div><span><strong>Made for farmers</strong><br />across every county in Kenya</span></div>
                </div>
                <div className="hero-visual">
                    <div className="visual-sun" />
                    <div className="hero-image" />
                    <div className="floating-card weather-card"><div className="mini-icon sky"><CloudSun size={17} /></div><div><small>Today in Kiambu</small><strong>24° <span>Good day to plant</span></strong></div></div>
                    <div className="floating-card insight-card"><div className="mini-icon green"><ShieldCheck size={17} /></div><div><small>Farm insight</small><strong>Maize looks healthy <Check size={15} /></strong></div></div>
                    <div className="hero-stamp"><Sprout size={19} /><span>Rooted in<br /><strong>Africa</strong></span></div>
                </div>
            </section>

            <section className="trust-strip"><span>One companion for every season</span><div><span><Leaf size={16} /> KALRO-minded</span><span><ShieldCheck size={16} /> Practical & trusted</span><span><Users size={16} /> Community-first</span></div></section>

            <section className="section-block features-section" id="why">
                <div className="section-heading"><div><div className="eyebrow">Everything your farm needs to move forward</div><h2>From uncertainty<br /><em>to confidence.</em></h2></div><p>Technology should feel useful in the field. KilimoChat turns powerful AI into simple guidance that respects your time, your language and your experience.</p></div>
                <div className="feature-grid">{featureCards.map(({ icon: Icon, tone, title, text }) => <article className="feature-card" key={title}><div className={`feature-icon ${tone}`}><Icon size={22} /></div><h3>{title}</h3><p>{text}</p><a href="#access">Explore <ArrowUpRight size={15} /></a></article>)}</div>
            </section>

            <section className="story-section" id="how"><div className="story-photo"><div className="photo-label"><span className="photo-dot" /> Field-tested thinking</div></div><div className="story-copy"><div className="eyebrow">A smarter rhythm for farm life</div><h2>Good farming starts with a good question.</h2><p>Whether you are checking a leaf at sunrise, comparing prices before market day, or planning around rain, KilimoChat helps you make the next decision with more clarity.</p><div className="step-list">{steps.map(([number, title, text]) => <div className="step" key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></div>)}</div></div></section>

            <section className="whatsapp-section" id="whatsapp"><div className="whatsapp-orbit"><MessageCircle size={40} /></div><div><div className="eyebrow light">No app store? No problem.</div><h2>Meet your farm assistant<br /><em>on WhatsApp.</em></h2><p>Send a question, photo or voice note to KilimoChat from the app millions of people already use. Advice comes back where your conversations already live.</p><a className="light-button" href="https://wa.me/" target="_blank" rel="noreferrer">Start on WhatsApp <ArrowUpRight size={17} /></a></div><div className="whatsapp-pattern">CHAT<br />GROW<br />THRIVE</div></section>

            <section className="access-section" id="access"><div className="section-heading"><div><div className="eyebrow">Choose your way in</div><h2>Tools that travel<br /><em>with you.</em></h2></div><p>Use KilimoChat wherever your farm takes you. Your account, conversations and practical support stay connected.</p></div><div className="access-grid"><article className="access-card featured-access"><div className="access-card-top"><div className="access-icon"><Smartphone size={24} /></div><span>Most popular</span></div><h3>Mobile app</h3><p>Made for Android, ready for the field, and designed to work across all screen sizes.</p><a href="#download" className="primary-button">Download for Android <Download size={17} /></a><small>Free to start · No Expo Go required</small></article><article className="access-card" id="download"><div className="access-icon desktop"><Download size={24} /></div><h3>Desktop workspace</h3><p>A focused full-screen experience for Windows and Linux, with more room for deeper work.</p><a href="#download" className="outline-button">Get Windows & Linux <ArrowUpRight size={17} /></a><small>Secure Electron desktop apps</small></article><article className="access-card"><div className="access-icon whatsapp"><MessageCircle size={24} /></div><h3>WhatsApp</h3><p>Ask questions, send voice notes and share crop photos without installing anything new.</p><a href="#whatsapp" className="outline-button">Connect on WhatsApp <ArrowUpRight size={17} /></a><small>Works on any phone</small></article></div></section>

            <section className="quote-section"><div className="quote-mark">“</div><blockquote>When the advice is clear, the next step feels possible.</blockquote><div className="quote-meta"><div className="quote-avatar">W</div><span><strong>Wanjiku M.</strong><br />Smallholder farmer, Murang&apos;a</span><div className="stars">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={14} fill="currentColor" />)}</div></div></section>

            <footer className="marketing-footer"><div className="marketing-brand"><span className="brand-icon"><Sprout size={21} /></span><span>Kilimo<span>Chat</span></span></div><p>Practical intelligence for the people who grow our future.</p><div className="footer-links"><a href="#why">Features</a><a href="#access">Download</a><a href="#whatsapp">WhatsApp</a><a href="/login">Sign in</a></div><small>© 2026 KilimoChat · Built with care for African farmers</small></footer>
        </main>
    );
};

export default MarketingHome;