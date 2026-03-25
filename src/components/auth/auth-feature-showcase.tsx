'use client';

import { useEffect, useState, useMemo } from 'react';

const features = [
  {
    id: 'invoice',
    icon: '📄',
    title: 'Professional Invoicing',
    subtitle: 'Business billing made easy',
    description: 'Generate, track, and manage professional invoices for your business in seconds. Get paid faster with integrated payment links.',
    color: '#0ea5e9',
    glowColor: 'rgba(14,165,233,0.35)',
    widget: (
      <div className="kf-widget kf-widget-invoice">
        <div className="kf-invoice-card">
          <div className="kf-invoice-header">
            <div className="kf-invoice-id">#INV-2024-082</div>
            <div className="kf-invoice-status">SENT</div>
          </div>
          <div className="kf-invoice-amount">GH₵ 4,250.00</div>
          <div className="kf-invoice-progress">
            <div className="kf-invoice-bar" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'reminders',
    icon: '🔔',
    title: 'Smart Bill Reminders',
    subtitle: 'Never miss a payment',
    description: 'Automatic tracking of your recurring bills. Get smart alerts before they\'re due and avoid late fees effortlessly.',
    color: '#f43f5e',
    glowColor: 'rgba(244,63,94,0.35)',
    widget: (
      <div className="kf-widget kf-widget-reminders">
        <div className="kf-reminder-item">
          <div className="kf-reminder-icon">⚡</div>
          <div className="kf-reminder-info">
            <div className="kf-reminder-name">Electricity Bill</div>
            <div className="kf-reminder-due">Due in 2 days</div>
          </div>
          <div className="kf-reminder-action">FIXED</div>
        </div>
        <div className="kf-reminder-pulse" />
      </div>
    ),
  },
  {
    id: 'savego',
    icon: '🚀',
    title: 'Save Go',
    subtitle: 'Reach your goals faster',
    description: 'Set financial goals and let our smart algorithms help you save. Track your progress with beautiful, real-time visualizations.',
    color: '#10b981',
    glowColor: 'rgba(16,185,129,0.35)',
    widget: (
      <div className="kf-widget kf-widget-savego">
        <div className="kf-goal-header">
          <span>New Laptop</span>
          <span>75%</span>
        </div>
        <div className="kf-goal-track">
          <div className="kf-goal-fill" />
        </div>
        <div className="kf-goal-stats">
          GH₵ 8,500 / GH₵ 12,000
        </div>
      </div>
    ),
  },
  {
    id: 'ask',
    icon: '✨',
    title: 'Ask Kontrola',
    subtitle: 'Your AI Financial Assistant',
    description: 'Get instant answers to your financial questions. Query your spending habits, get advice, and generate reports via chat.',
    color: '#8b5cf6',
    glowColor: 'rgba(139,92,246,0.35)',
    widget: (
      <div className="kf-widget kf-widget-ask">
        <div className="kf-chat-bubble kf-chat-left">How much did I spend on food?</div>
        <div className="kf-chat-bubble kf-chat-right">You spent GH₵ 1,240 this month. 🍔</div>
        <div className="kf-ai-wave">
          <span /><span /><span />
        </div>
      </div>
    ),
  },
];

export function AuthFeatureShowcase() {
  const [active, setActive] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setActive(prev => (prev + 1) % features.length);
        setAnimating(false);
      }, 400);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const feat = features[active];

  return (
    <>
      <style>{`
        .kf-root {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 2rem;
          background: radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%);
        }

        /* Ambient futuristic orbs */
        .kf-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.3;
          animation: kf-drift linear infinite;
          pointer-events: none;
        }
        .kf-orb-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, var(--feat-color, #0ea5e9) 0%, transparent 70%);
          top: -10%; left: -10%;
          animation-duration: 25s;
        }
        .kf-orb-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #8b5cf6 0%, transparent 70%);
          bottom: -10%; right: -10%;
          animation-duration: 30s;
          animation-delay: -5s;
        }
        @keyframes kf-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }

        /* Abstract data grid */
        .kf-grid {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 50px 50px;
          mask-image: radial-gradient(circle at 50% 50%, black, transparent 80%);
          pointer-events: none;
        }

        /* Floating particles */
        .kf-particle {
          position: absolute;
          background: white;
          border-radius: 50%;
          opacity: 0.15;
          pointer-events: none;
          animation: kf-float-up linear infinite;
        }
        @keyframes kf-float-up {
          from { transform: translateY(100vh) scale(1); opacity: 0; }
          10% { opacity: 0.2; }
          90% { opacity: 0.2; }
          to { transform: translateY(-10vh) scale(0.5); opacity: 0; }
        }

        /* Logo */
        .kf-logo {
          font-size: 1.1rem;
          font-weight: 800;
          letter-spacing: 0.25em;
          color: #fff;
          margin-bottom: 3rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          position: relative;
          z-index: 10;
        }
        .kf-logo-symbol {
          width: 14px; height: 14px;
          border: 2px solid var(--feat-color, #0ea5e9);
          transform: rotate(45deg);
          box-shadow: 0 0 15px var(--feat-glow, rgba(14,165,233,0.5));
          transition: all 0.6s ease;
        }

        /* 3D Container */
        .kf-3d-wrap {
          perspective: 1200px;
          width: 100%;
          max-width: 420px;
          position: relative;
          z-index: 10;
        }
        .kf-glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 32px;
          padding: 2.5rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5),
                      inset 0 1px 1px rgba(255, 255, 255, 0.1);
          transform-style: preserve-3d;
          animation: kf-card-hover 8s ease-in-out infinite;
          transition: all 0.8s cubic-bezier(0.23, 1, 0.32, 1);
        }
        @keyframes kf-card-hover {
          0%, 100% { transform: rotateY(-5deg) rotateX(5deg) translateY(0); }
          50% { transform: rotateY(5deg) rotateX(-5deg) translateY(-15px); }
        }

        .kf-content {
          transition: all 0.5s ease;
          opacity: 1;
          transform: translateZ(20px);
        }
        .kf-content.fadeOut {
          opacity: 0;
          transform: translateZ(0) translateY(10px);
        }

        .kf-icon-box {
          width: 50px; height: 50px;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        
        .kf-feature-subtitle {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: var(--feat-color, #0ea5e9);
          margin-bottom: 0.5rem;
          transition: color 0.6s ease;
        }

        .kf-feature-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 1rem;
          letter-spacing: -0.02em;
        }

        .kf-feature-desc {
          font-size: 0.95rem;
          line-height: 1.6;
          color: rgba(255,255,255,0.5);
          margin-bottom: 2rem;
        }

        /* Widget display area */
        .kf-widget-container {
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 20px;
          padding: 1.25rem;
          min-height: 120px;
          display: flex; align-items: center; justify-content: center;
          transform: translateZ(40px);
          box-shadow: inset 0 2px 10px rgba(0,0,0,0.3);
        }

        /* Invoice Widget */
        .kf-widget-invoice { width: 100%; }
        .kf-invoice-card {
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 1rem;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .kf-invoice-header { display: flex; justify-content: space-between; margin-bottom: 0.75rem; }
        .kf-invoice-id { font-size: 0.65rem; color: rgba(255,255,255,0.4); font-family: monospace; }
        .kf-invoice-status { font-size: 0.6rem; font-weight: 700; color: #0ea5e9; background: rgba(14,165,233,0.1); padding: 2px 6px; border-radius: 4px; }
        .kf-invoice-amount { font-size: 1.1rem; font-weight: 700; color: #fff; margin-bottom: 0.75rem; }
        .kf-invoice-progress { height: 4px; background: rgba(255,255,255,0.1); border-radius: 99px; overflow: hidden; }
        .kf-invoice-bar { height: 100%; width: 65%; background: #0ea5e9; border-radius: 99px; }

        /* Reminders Widget */
        .kf-widget-reminders { width: 100%; position: relative; }
        .kf-reminder-item {
          display: flex; align-items: center; gap: 1rem;
          background: rgba(244,63,94,0.05);
          border: 1px solid rgba(244,63,94,0.2);
          padding: 0.75rem; border-radius: 12px;
        }
        .kf-reminder-icon { font-size: 1.25rem; }
        .kf-reminder-name { font-size: 0.75rem; font-weight: 600; color: #fff; }
        .kf-reminder-due { font-size: 0.65rem; color: rgba(244,63,94,0.8); }
        .kf-reminder-action { margin-left: auto; font-size: 0.6rem; font-weight: 700; color: #fff; opacity: 0.4; }
        .kf-reminder-pulse {
          position: absolute; top: -5px; right: -5px; width: 10px; height: 10px;
          background: #f43f5e; border-radius: 50%;
          animation: kf-pulse-red 2s infinite;
        }
        @keyframes kf-pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(244,63,94,0.7); transform: scale(0.95); }
          70% { box-shadow: 0 0 0 10px rgba(244,63,94,0); transform: scale(1); }
          100% { box-shadow: 0 0 0 0 rgba(244,63,94,0); transform: scale(0.95); }
        }

        /* SaveGo Widget */
        .kf-widget-savego { width: 100%; }
        .kf-goal-header { display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 600; color: #fff; margin-bottom: 0.5rem; }
        .kf-goal-track { height: 8px; background: rgba(255,255,255,0.05); border-radius: 99px; margin-bottom: 0.75rem; overflow: hidden; }
        .kf-goal-fill { height: 100%; width: 75%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 99px; }
        .kf-goal-stats { font-size: 0.65rem; color: rgba(255,255,255,0.4); text-align: right; }

        /* Ask Widget */
        .kf-widget-ask { width: 100%; display: flex; flex-direction: column; gap: 0.5rem; }
        .kf-chat-bubble { font-size: 0.7rem; padding: 0.5rem 0.75rem; border-radius: 12px; max-width: 80%; line-height: 1.4; }
        .kf-chat-left { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); align-self: flex-start; border-bottom-left-radius: 2px; }
        .kf-chat-right { background: rgba(139,92,246,0.15); color: #fff; align-self: flex-end; border-bottom-right-radius: 2px; border: 1px solid rgba(139,92,246,0.2); }
        .kf-ai-wave { display: flex; gap: 3px; justify-content: center; margin-top: 5px; }
        .kf-ai-wave span { width: 3px; height: 3px; background: #8b5cf6; border-radius: 50%; animation: kf-wave 1.5s infinite; }
        .kf-ai-wave span:nth-child(2) { animation-delay: 0.2s; }
        .kf-ai-wave span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes kf-wave { 0%, 100% { transform: translateY(0); opacity: 0.3; } 50% { transform: translateY(-4px); opacity: 1; } }

        /* Navigation dots */
        .kf-dots {
          display: flex; gap: 0.75rem; margin-top: 3rem; position: relative; z-index: 10;
        }
        .kf-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: rgba(255,255,255,0.1);
          transition: all 0.4s ease; cursor: pointer; border: none;
        }
        .kf-dot.active {
          background: var(--feat-color, #0ea5e9);
          transform: scale(1.3);
          box-shadow: 0 0 15px var(--feat-glow, rgba(14,165,233,0.5));
        }

        /* Footer tags */
        .kf-tags {
          display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: center;
          margin-top: 2rem; position: relative; z-index: 10;
        }
        .kf-tag {
          font-size: 0.7rem; font-weight: 700; color: rgba(255,255,255,0.4);
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          padding: 0.4rem 1rem; border-radius: 100px;
          letter-spacing: 0.05em; transition: all 0.3s ease;
        }
        .kf-tag:hover { color: #fff; border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); }
      `}</style>

      <div
        className="kf-root"
        style={{
          // @ts-ignore
          '--feat-color': feat.color,
          '--feat-glow': feat.glowColor,
        } as React.CSSProperties}
      >
        <div className="kf-grid" />
        
        {/* Ambient background orbs */}
        <div className="kf-orb kf-orb-1" />
        <div className="kf-orb kf-orb-2" />

        {/* Animated particles */}
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="kf-particle"
            style={{
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 10 + 10}s`,
              animationDelay: `-${Math.random() * 10}s`,
              opacity: Math.random() * 0.2,
            }}
          />
        ))}

        <div className="kf-logo">
          <div className="kf-logo-symbol" />
          KONTROLA
        </div>

        <div className="kf-3d-wrap">
          <div className="kf-glass-card">
            <div className={`kf-content${animating ? ' fadeOut' : ''}`}>
              <div className="kf-icon-box">
                {feat.icon}
              </div>
              <div className="kf-feature-subtitle">{feat.subtitle}</div>
              <h2 className="kf-feature-title">{feat.title}</h2>
              <p className="kf-feature-desc">{feat.description}</p>
              
              <div className="kf-widget-container">
                {feat.widget}
              </div>
            </div>
          </div>
        </div>

        <div className="kf-dots">
          {features.map((f, i) => (
            <button
              key={f.id}
              className={`kf-dot ${i === active ? 'active' : ''}`}
              onClick={() => setActive(i)}
            />
          ))}
        </div>

        <div className="kf-tags">
          {['Invoicing', 'Bill Reminders', 'Save Go', 'AI Chatbot', 'Business Tools'].map((tag) => (
            <span key={tag} className="kf-tag">{tag}</span>
          ))}
        </div>
      </div>
    </>
  );
}
