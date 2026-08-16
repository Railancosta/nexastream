'use client';

import { useState } from 'react';
import { useContractRead, useContractWrite, useAccount } from 'wagmi';
import { VERIFICATION_ABI } from '@/utils/contracts';

const VERIFICATION_ADDRESS = process.env.NEXT_PUBLIC_VERIFICATION_CONTRACT;

const VERIFICATION_LEVELS = {
  0: { name: 'Nenhum', color: '#6b7280', benefits: [] },
  1: { name: 'Básico', color: '#3b82f6', benefits: ['Acesso ao marketplace NFT', 'Ferramentas básicas de criação'] },
  2: { name: 'Profissional', color: '#8b5cf6', benefits: ['Tudo do Básico', 'Taxas reduzidas (2%)', 'Suporte prioritário', 'Programa de afiliados'] },
  3: { name: 'Enterprise', color: '#f59e0b', benefits: ['Tudo do Profissional', 'Taxas mínimas (1%)', 'API acesso completo', 'Gerente de conta dedicado'] },
};

export default function CreatorVerification() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('levels');
  const [applying, setApplying] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    country: '',
    documentType: 'passport',
    level: 1,
    agreeTerms: false,
  });

  // Read creator info
  const { data: creatorInfo } = useContractRead({
    address: VERIFICATION_ADDRESS,
    abi: VERIFICATION_ABI,
    functionName: 'getCreatorInfo',
    args: [address],
    enabled: !!address,
  });

  // Read staking requirements
  const { data: stakingBasic } = useContractRead({
    address: VERIFICATION_ADDRESS,
    abi: VERIFICATION_ABI,
    functionName: 'getStakingRequirement',
    args: [1],
  });

  const { data: stakingPro } = useContractRead({
    address: VERIFICATION_ADDRESS,
    abi: VERIFICATION_ABI,
    functionName: 'getStakingRequirement',
    args: [2],
  });

  const { data: stakingEnterprise } = useContractRead({
    address: VERIFICATION_ADDRESS,
    abi: VERIFICATION_ABI,
    functionName: 'getStakingRequirement',
    args: [3],
  });

  // Request verification
  const { write: requestVerification, isLoading: requesting } = useContractWrite({
    address: VERIFICATION_ADDRESS,
    abi: VERIFICATION_ABI,
    functionName: 'requestVerification',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.agreeTerms) {
      alert('Você precisa aceitar os termos e condições');
      return;
    }

    setApplying(true);
    try {
      const stakingAmount = formData.level === 1 
        ? stakingBasic 
        : formData.level === 2 
          ? stakingPro 
          : stakingEnterprise;

      requestVerification({
        args: [
          formData.name,
          `ipfs://QmExample/${address}`,
          formData.level,
        ],
        value: stakingAmount || BigInt(0),
      });
    } catch (error) {
      console.error('Error requesting verification:', error);
    }
    setApplying(false);
  };

  const tabs = [
    { id: 'levels', label: 'Níveis', icon: '🏆' },
    { id: 'apply', label: 'Candidatar-se', icon: '📝' },
    { id: 'benefits', label: 'Benefícios', icon: '⭐' },
    { id: 'faq', label: 'FAQ', icon: '❓' },
  ];

  const benefits = [
    { icon: '💰', title: 'Taxas Reduzidas', desc: 'Ganhe até 50% de desconto em taxas de plataforma' },
    { icon: '🎯', title: 'Visibilidade', desc: 'Destaque no marketplace e recomendações' },
    { icon: '📊', title: 'Analytics', desc: 'Acesso a métricas avançadas e insights' },
    { icon: '🎁', title: 'Airdrops', desc: 'Prioridade em分发 de novos tokens e recompensas' },
    { icon: '💎', title: 'Badge Exclusivo', desc: 'Selo de verificação visível no perfil' },
    { icon: '🆘', title: 'Suporte', desc: 'Atendimento prioritário 24/7' },
  ];

  const faqs = [
    { q: 'O que é o programa de verificação?', a: 'O programa de verificação do NexaStream permite que criadores comprovem sua identidade e ottenham acesso a benefícios exclusivos, incluindo taxas reduzidas e maior visibilidade na plataforma.' },
    { q: 'Quanto custa para me candidatar?', a: 'O custo varia por nível: Básico (0.1 ETH), Profissional (1 ETH), e Enterprise (10 ETH). Este valor é bloqueado como garantia e pode ser recuperado.' },
    { q: 'Quanto tempo leva o processo?', a: 'Após enviar sua candidatura, nossa equipe analisa em até 48 horas. Você receberá uma notificação quando seu status for atualizado.' },
    { q: 'Posso fazer upgrade do meu nível?', a: 'Sim! Você pode fazer upgrade do seu nível a qualquer momento, basta pagar a diferença de staking requerida.' },
    { q: 'Perco meu stake se for verificado?', a: 'Não. Seu stake permanece bloqueado enquanto você mantiver o status de verificado. Você pode solicitar o desbloqueio se decidir sair do programa.' },
  ];

  return (
    <div className="creator-verification">
      <div className="header">
        <h1>🏅 Programa de Verificação</h1>
        <p>Torne-se um criador verificado e desbloqueie benefícios exclusivos</p>
      </div>

      {creatorInfo?.[4] && (
        <div className="status-banner success">
          <span>✅</span>
          <div>
            <strong>Status: Verificado ({creatorInfo[1]})</strong>
            <p>Você tem acesso a todos os benefícios do nível {creatorInfo[1]}</p>
          </div>
        </div>
      )}

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'levels' && (
          <div className="levels-section">
            <h2>Escolha seu Nível de Verificação</h2>
            <div className="levels-grid">
              {[1, 2, 3].map((level) => {
                const info = VERIFICATION_LEVELS[level];
                const staking = level === 1 ? stakingBasic : level === 2 ? stakingPro : stakingEnterprise;
                return (
                  <div 
                    key={level} 
                    className={`level-card ${level === 2 ? 'popular' : ''}`}
                    style={{ borderColor: info.color }}
                  >
                    {level === 2 && <span className="popular-badge">Mais Popular</span>}
                    <div className="level-header" style={{ background: info.color }}>
                      <h3>{info.name}</h3>
                      <p className="staking">
                        Stake: {staking ? (Number(staking) / 1e18).toFixed(2) : '0'} ETH
                      </p>
                    </div>
                    <ul className="benefits-list">
                      {info.benefits.map((benefit, i) => (
                        <li key={i}>✓ {benefit}</li>
                      ))}
                    </ul>
                    <button 
                      className="select-btn"
                      style={{ background: info.color }}
                      onClick={() => {
                        setFormData({ ...formData, level });
                        setActiveTab('apply');
                      }}
                    >
                      Selecionar {info.name}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'apply' && (
          <div className="apply-section">
            <h2>Candidatar-se à Verificação</h2>
            <form className="apply-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nome Completo</label>
                <input 
                  type="text" 
                  placeholder="Seu nome completo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>País de Residência</label>
                <select 
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  required
                >
                  <option value="">Selecione...</option>
                  <option value="BR">Brasil</option>
                  <option value="US">Estados Unidos</option>
                  <option value="UK">Reino Unido</option>
                  <option value="DE">Alemanha</option>
                  <option value="JP">Japão</option>
                </select>
              </div>
              <div className="form-group">
                <label>Tipo de Documento</label>
                <select 
                  value={formData.documentType}
                  onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                >
                  <option value="passport">Passaporte</option>
                  <option value="id">Carteira de Identidade</option>
                  <option value="driver">CNH</option>
                </select>
              </div>
              <div className="form-group">
                <label>Nível de Verificação</label>
                <div className="level-options">
                  {[1, 2, 3].map((level) => {
                    const info = VERIFICATION_LEVELS[level];
                    const staking = level === 1 ? stakingBasic : level === 2 ? stakingPro : stakingEnterprise;
                    return (
                      <label key={level} className="level-option">
                        <input 
                          type="radio" 
                          name="level"
                          value={level}
                          checked={formData.level === level}
                          onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                        />
                        <span className="level-label" style={{ borderColor: info.color }}>
                          <strong>{info.name}</strong>
                          <small>{(staking ? (Number(staking) / 1e18).toFixed(2) : '0')} ETH</small>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="form-group checkbox">
                <label>
                  <input 
                    type="checkbox"
                    checked={formData.agreeTerms}
                    onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.value })}
                  />
                  Eu concordo com os <a href="/terms">Termos de Serviço</a> e <a href="/privacy">Política de Privacidade</a>
                </label>
              </div>
              <div className="warning-box">
                <p>⚠️ Você precisará fazer staking de ETH para se candidatar. Este valor será bloqueado até a aprovação.</p>
              </div>
              <button type="submit" className="submit-btn" disabled={applying || !isConnected}>
                {applying ? 'Enviando...' : '📝 Solicitar Verificação'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'benefits' && (
          <div className="benefits-section">
            <h2>Benefícios para Criadores Verificados</h2>
            <div className="benefits-grid">
              {benefits.map((benefit, i) => (
                <div key={i} className="benefit-card">
                  <span className="benefit-icon">{benefit.icon}</span>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'faq' && (
          <div className="faq-section">
            <h2>Perguntas Frequentes</h2>
            <div className="faq-list">
              {faqs.map((faq, i) => (
                <div key={i} className="faq-item">
                  <h3>{faq.q}</h3>
                  <p>{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .creator-verification {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }
        .header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .header h1 {
          font-size: 2.5rem;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 0.5rem;
        }
        .status-banner {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          margin-bottom: 2rem;
        }
        .status-banner.success {
          background: #f0fdf4;
          border: 2px solid #10b981;
        }
        .status-banner span { font-size: 2rem; }
        .status-banner strong { display: block; }
        .status-banner p { margin: 0.5rem 0 0; }
        .tabs {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          border-bottom: 2px solid #eee;
          padding-bottom: 1rem;
        }
        .tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: white;
          border: 2px solid #eee;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .tab:hover { border-color: #f59e0b; }
        .tab.active {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          border-color: transparent;
        }
        .tab-icon { font-size: 1.2rem; }
        .tab-content {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .levels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }
        .level-card {
          background: white;
          border-radius: 16px;
          border: 3px solid;
          overflow: hidden;
          position: relative;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .level-card.popular { transform: scale(1.05); }
        .popular-badge {
          position: absolute;
          top: 1rem;
          right: -2rem;
          background: #dc2626;
          color: white;
          padding: 0.5rem 2.5rem;
          font-size: 0.75rem;
          transform: rotate(45deg);
        }
        .level-header {
          padding: 1.5rem;
          color: white;
          text-align: center;
        }
        .level-header h3 { margin: 0; font-size: 1.5rem; }
        .staking { margin: 0.5rem 0 0; opacity: 0.9; }
        .benefits-list {
          padding: 1.5rem;
          list-style: none;
          margin: 0;
        }
        .benefits-list li {
          padding: 0.5rem 0;
          border-bottom: 1px solid #eee;
        }
        .benefits-list li:last-child { border: none; }
        .select-btn {
          width: 100%;
          padding: 1rem;
          color: white;
          border: none;
          font-size: 1rem;
          font-weight: bold;
          cursor: pointer;
        }
        .select-btn:hover { opacity: 0.9; }
        .apply-form { max-width: 600px; }
        .form-group { margin-bottom: 1.5rem; }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }
        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #eee;
          border-radius: 8px;
          font-size: 1rem;
        }
        .level-options {
          display: flex;
          gap: 1rem;
        }
        .level-option {
          flex: 1;
          cursor: pointer;
        }
        .level-option input { display: none; }
        .level-label {
          display: block;
          padding: 1rem;
          border: 2px solid;
          border-radius: 8px;
          text-align: center;
        }
        .level-option input:checked + .level-label {
          background: #fef3c7;
        }
        .form-group.checkbox label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }
        .form-group.checkbox a {
          color: #f59e0b;
        }
        .warning-box {
          padding: 1rem;
          background: #fef3c7;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }
        .warning-box p { margin: 0; }
        .submit-btn {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: bold;
          cursor: pointer;
        }
        .submit-btn:hover { opacity: 0.9; }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .benefits-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1.5rem;
        }
        .benefit-card {
          padding: 1.5rem;
          background: #f8f9fa;
          border-radius: 12px;
          text-align: center;
        }
        .benefit-icon { font-size: 3rem; }
        .benefit-card h3 { margin: 1rem 0 0.5rem; }
        .benefit-card p { margin: 0; color: #666; }
        .faq-list { display: flex; flex-direction: column; gap: 1rem; }
        .faq-item {
          padding: 1.5rem;
          background: #f8f9fa;
          border-radius: 12px;
        }
        .faq-item h3 { margin: 0 0 0.5rem; color: #f59e0b; }
        .faq-item p { margin: 0; color: #666; }
        @media (max-width: 768px) {
          .level-card.popular { transform: none; }
          .level-options { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
