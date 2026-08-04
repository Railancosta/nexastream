'use client';

import { useState, useEffect } from 'react';
import { useContractRead, useContractWrite, useAccount } from 'wagmi';
import { DAO_ABI, TOKEN_ABI } from '@/utils/contracts';

const DAO_ADDRESS = process.env.NEXT_PUBLIC_DAO_CONTRACT;
const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_CONTRACT;

export default function DAOGovernance() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('proposals');
  const [proposals, setProposals] = useState([]);
  const [newProposal, setNewProposal] = useState({ title: '', description: '', target: '', amount: '' });

  // Read proposals count
  const { data: proposalCount } = useContractRead({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'proposalCount',
    enabled: !!address,
  });

  // Read user's token balance
  const { data: tokenBalance } = useContractRead({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
  });

  // Read voting power
  const { data: votingPower } = useContractRead({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'getVotes',
    args: [address],
    enabled: !!address,
  });

  // Cast vote
  const { write: castVote, isLoading: voting } = useContractWrite({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'castVote',
  });

  // Create proposal
  const { write: createProposal, isLoading: creating } = useContractWrite({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'propose',
  });

  const handleVote = (proposalId, support) => {
    try {
      castVote({
        args: [proposalId, support ? 1 : 0],
      });
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleCreateProposal = async (e) => {
    e.preventDefault();
    if (!newProposal.title || !newProposal.description) return;
    
    try {
      const targets = [newProposal.target || DAO_ADDRESS];
      const values = [newProposal.amount ? BigInt(newProposal.amount) : BigInt(0)];
      const calldatas = ['0x'];
      
      createProposal({
        args: [targets, values, calldatas, newProposal.description],
      });
      
      setNewProposal({ title: '', description: '', target: '', amount: '' });
    } catch (error) {
      console.error('Error creating proposal:', error);
    }
  };

  const sampleProposals = [
    {
      id: 1,
      title: 'Aumentar recompensas para criadores verificados',
      description: 'Proposta para aumentar as recompensas em 20% para criadores verificados no programa de monetização.',
      forVotes: 1250000,
      againstVotes: 320000,
      endTime: '2 dias',
      status: 'active',
      proposer: '0x1234...5678',
    },
    {
      id: 2,
      title: 'Integrar suporte para Celo Mainnet',
      description: 'Implementar infraestrutura para suportar transações na blockchain Celo para reduzir taxas de gás.',
      forVotes: 2100000,
      againstVotes: 150000,
      endTime: '4 dias',
      status: 'active',
      proposer: '0xabcd...efgh',
    },
    {
      id: 3,
      title: 'Fundo de marketing para expansão',
      description: 'Alocar 500,000 tokens NEXA para campanhas de marketing e parcerias estratégicas.',
      forVotes: 980000,
      againstVotes: 720000,
      endTime: 'Encerrada',
      status: 'passed',
      proposer: '0x9999...1111',
    },
  ];

  const tabs = [
    { id: 'proposals', label: 'Propostas', icon: '📋' },
    { id: 'create', label: 'Criar Proposta', icon: '✨' },
    { id: 'treasury', label: 'Tesouraria', icon: '💰' },
    { id: 'delegates', label: 'Delegados', icon: '👥' },
  ];

  return (
    <div className="dao-governance">
      <div className="dao-header">
        <h1>🏛️ NexaStream DAO</h1>
        <p>Governança descentralizada da plataforma</p>
      </div>

      <div className="dao-stats">
        <div className="stat-card">
          <span className="stat-icon">📊</span>
          <div className="stat-info">
            <h3>{sampleProposals.length}</h3>
            <p>Propostas</p>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">👥</span>
          <div className="stat-info">
            <h3>1,234</h3>
            <p>Delegados</p>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💎</span>
          <div className="stat-info">
            <h3>2.5M</h3>
            <p>NEXA em staking</p>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🗳️</span>
          <div className="stat-info">
            <h3>{tokenBalance ? (Number(tokenBalance) / 1e18).toFixed(0) : '0'}</h3>
            <p>Seu saldo NEXA</p>
          </div>
        </div>
      </div>

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
        {activeTab === 'proposals' && (
          <div className="proposals-section">
            <h2>Propostas da DAO</h2>
            <div className="proposals-list">
              {sampleProposals.map((proposal) => (
                <div key={proposal.id} className={`proposal-card ${proposal.status}`}>
                  <div className="proposal-header">
                    <span className={`status-badge ${proposal.status}`}>
                      {proposal.status === 'active' ? '🔴 Ativa' : '✅ Aprovada'}
                    </span>
                    <span className="proposal-time">⏰ {proposal.endTime}</span>
                  </div>
                  <h3>{proposal.title}</h3>
                  <p>{proposal.description}</p>
                  <div className="proposal-meta">
                    <span>Por: {proposal.proposer}</span>
                  </div>
                  <div className="voting-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-for"
                        style={{ width: `${(proposal.forVotes / (proposal.forVotes + proposal.againstVotes)) * 100}%` }}
                      ></div>
                    </div>
                    <div className="vote-stats">
                      <span className="for">✅ {((proposal.forVotes / 1e6).toFixed(2))}M</span>
                      <span className="against">❌ {((proposal.againstVotes / 1e6).toFixed(2))}M</span>
                    </div>
                  </div>
                  {proposal.status === 'active' && (
                    <div className="voting-actions">
                      <button 
                        className="vote-btn for"
                        onClick={() => handleVote(proposal.id, true)}
                        disabled={!isConnected || voting}
                      >
                        ✅ Votar A Favor
                      </button>
                      <button 
                        className="vote-btn against"
                        onClick={() => handleVote(proposal.id, false)}
                        disabled={!isConnected || voting}
                      >
                        ❌ Votar Contra
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'create' && (
          <div className="create-section">
            <h2>Criar Nova Proposta</h2>
            <form className="proposal-form" onSubmit={handleCreateProposal}>
              <div className="form-group">
                <label>Título da Proposta</label>
                <input 
                  type="text" 
                  placeholder="Ex: Implementar novo recurso X"
                  value={newProposal.title}
                  onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Descrição Completa</label>
                <textarea 
                  placeholder="Descreva detalhadamente sua proposta..."
                  rows={6}
                  value={newProposal.description}
                  onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
                ></textarea>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Endereço Alvo (opcional)</label>
                  <input 
                    type="text" 
                    placeholder="0x..."
                    value={newProposal.target}
                    onChange={(e) => setNewProposal({...newProposal, target: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Valor (ETH opcional)</label>
                  <input 
                    type="number" 
                    placeholder="0.0"
                    value={newProposal.amount}
                    onChange={(e) => setNewProposal({...newProposal, amount: e.target.value})}
                  />
                </div>
              </div>
              <div className="requirement-note">
                <p>⚠️ Você precisa de pelo menos 1M tokens NEXA para criar uma proposta.</p>
                <p>Seu saldo atual: {tokenBalance ? (Number(tokenBalance) / 1e18).toFixed(0) : '0'} NEXA</p>
              </div>
              <button type="submit" className="create-btn" disabled={creating || !isConnected}>
                {creating ? 'Criando...' : '✨ Criar Proposta'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'treasury' && (
          <div className="treasury-section">
            <h2>💰 Tesouraria da DAO</h2>
            <div className="treasury-overview">
              <div className="treasury-card main">
                <h3>Saldo Total</h3>
                <p className="balance">1,250,000 NEXA</p>
                <p className="equivalent">≈ $125,000 USD</p>
              </div>
              <div className="treasury-card">
                <h3>ETH</h3>
                <p className="balance">45.2 ETH</p>
              </div>
              <div className="treasury-card">
                <h3>Propostas Aprovadas</h3>
                <p className="balance">12</p>
              </div>
            </div>
            <div className="recent-transactions">
              <h3>Transações Recentes</h3>
              <div className="transactions-list">
                {[
                  { to: 'Marketing Fund', amount: '50,000 NEXA', date: '2 dias atrás' },
                  { to: 'Dev Team', amount: '100,000 NEXA', date: '5 dias atrás' },
                  { to: 'Partnership', amount: '25,000 NEXA', date: '1 semana atrás' },
                ].map((tx, i) => (
                  <div key={i} className="transaction-item">
                    <span>📤</span>
                    <div className="tx-info">
                      <p>{tx.to}</p>
                      <small>{tx.date}</small>
                    </div>
                    <span className="tx-amount">-{tx.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'delegates' && (
          <div className="delegates-section">
            <h2>👥 Delegados da DAO</h2>
            <div className="delegates-grid">
              {[
                { name: 'validator_eth', votes: '2.5M', proposals: 15, active: true },
                { name: 'defi_master', votes: '1.8M', proposals: 8, active: true },
                { name: 'creator_guild', votes: '1.2M', proposals: 12, active: true },
                { name: 'dao_voter_01', votes: '890K', proposals: 5, active: false },
              ].map((delegate, i) => (
                <div key={i} className="delegate-card">
                  <div className="delegate-header">
                    <span className="delegate-avatar">👤</span>
                    <span className={`status-dot ${delegate.active ? 'active' : ''}`}></span>
                  </div>
                  <h3>{delegate.name}</h3>
                  <div className="delegate-stats">
                    <div className="stat">
                      <span className="value">{delegate.votes}</span>
                      <span className="label">Votos</span>
                    </div>
                    <div className="stat">
                      <span className="value">{delegate.proposals}</span>
                      <span className="label">Propostas</span>
                    </div>
                  </div>
                  <button className="delegate-btn">Delegar Votos</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .dao-governance {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }
        .dao-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .dao-header h1 {
          font-size: 2.5rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 0.5rem;
        }
        .dao-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        }
        .stat-icon { font-size: 2rem; }
        .stat-info h3 { font-size: 1.5rem; margin: 0; }
        .stat-info p { margin: 0; color: #666; }
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
        .tab:hover { border-color: #10b981; }
        .tab.active {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
        .proposals-list { display: flex; flex-direction: column; gap: 1.5rem; }
        .proposal-card {
          padding: 1.5rem;
          background: #f8f9fa;
          border-radius: 12px;
          border-left: 4px solid #10b981;
        }
        .proposal-card.passed { border-left-color: #6b7280; }
        .proposal-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1rem;
        }
        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .status-badge.active { background: #fef2f2; color: #dc2626; }
        .status-badge.passed { background: #f0fdf4; color: #16a34a; }
        .proposal-time { color: #666; font-size: 0.9rem; }
        .proposal-card h3 { margin-bottom: 0.5rem; }
        .proposal-card p { color: #666; margin-bottom: 1rem; }
        .proposal-meta { font-size: 0.85rem; color: #888; margin-bottom: 1rem; }
        .voting-progress { margin-bottom: 1rem; }
        .progress-bar {
          height: 8px;
          background: #fee2e2;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }
        .progress-for {
          height: 100%;
          background: #10b981;
          transition: width 0.3s;
        }
        .vote-stats {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
        }
        .for { color: #10b981; }
        .against { color: #dc2626; }
        .voting-actions {
          display: flex;
          gap: 1rem;
        }
        .vote-btn {
          flex: 1;
          padding: 0.75rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s;
        }
        .vote-btn.for {
          background: #10b981;
          color: white;
        }
        .vote-btn.against {
          background: #fee2e2;
          color: #dc2626;
        }
        .vote-btn:hover { opacity: 0.9; }
        .vote-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .proposal-form { max-width: 700px; }
        .form-group { margin-bottom: 1.5rem; }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #eee;
          border-radius: 8px;
          font-size: 1rem;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .requirement-note {
          padding: 1rem;
          background: #fef3c7;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }
        .requirement-note p { margin: 0; font-size: 0.9rem; }
        .create-btn {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: bold;
          cursor: pointer;
        }
        .treasury-overview {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .treasury-card {
          padding: 1.5rem;
          background: #f8f9fa;
          border-radius: 12px;
        }
        .treasury-card.main {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }
        .treasury-card h3 { margin: 0 0 0.5rem; font-size: 1rem; opacity: 0.9; }
        .treasury-card .balance { font-size: 2rem; font-weight: bold; margin: 0; }
        .treasury-card .equivalent { font-size: 0.9rem; opacity: 0.8; margin: 0.5rem 0 0; }
        .transactions-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .transaction-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
        }
        .tx-info { flex: 1; }
        .tx-info p { margin: 0; font-weight: 600; }
        .tx-info small { color: #666; }
        .tx-amount { font-weight: bold; color: #dc2626; }
        .delegates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1.5rem;
        }
        .delegate-card {
          padding: 1.5rem;
          background: #f8f9fa;
          border-radius: 12px;
          text-align: center;
        }
        .delegate-header { position: relative; display: inline-block; }
        .delegate-avatar { font-size: 3rem; }
        .status-dot {
          position: absolute;
          bottom: 5px;
          right: -5px;
          width: 15px;
          height: 15px;
          background: #ccc;
          border-radius: 50%;
          border: 3px solid white;
        }
        .status-dot.active { background: #10b981; }
        .delegate-card h3 { margin: 1rem 0; }
        .delegate-stats {
          display: flex;
          justify-content: center;
          gap: 2rem;
          margin-bottom: 1rem;
        }
        .stat .value { display: block; font-size: 1.25rem; font-weight: bold; }
        .stat .label { font-size: 0.85rem; color: #666; }
        .delegate-btn {
          width: 100%;
          padding: 0.75rem;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
        @media (max-width: 768px) {
          .treasury-overview { grid-template-columns: 1fr; }
          .form-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
