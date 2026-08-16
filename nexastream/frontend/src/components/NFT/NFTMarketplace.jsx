'use client';

import { useState, useEffect } from 'react';
import { useContractRead, useContractWrite, useAccount, useNetwork } from 'wagmi';
import { parseEther } from 'viem';
import { NFT_ABI, MARKETPLACE_ABI } from '@/utils/contracts';

const NFT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT;
const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT;

export default function NFTMarketplace() {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const [activeTab, setActiveTab] = useState('browse');
  const [nfts, setNFTs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [listing, setListing] = useState({ price: '', tokenId: '' });
  const [buying, setBuying] = useState(null);

  // Read user's NFTs
  const { data: userNFTs } = useContractRead({
    address: NFT_ADDRESS,
    abi: NFT_ABI,
    functionName: 'getUserNFTs',
    args: [address],
    enabled: !!address,
  });

  // Create listing
  const { write: createListing, isLoading: listingLoading } = useContractWrite({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'listItem',
  });

  // Buy NFT
  const { write: buyItem, isLoading: buyingLoading } = useContractWrite({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'buyItem',
  });

  const handleListItem = async (e) => {
    e.preventDefault();
    if (!listing.price || !listing.tokenId) return;
    
    try {
      createListing({
        args: [NFT_ADDRESS, BigInt(listing.tokenId), parseEther(listing.price)],
      });
    } catch (error) {
      console.error('Error listing item:', error);
    }
  };

  const handleBuyItem = async (tokenId, price) => {
    setBuying(tokenId);
    try {
      buyItem({
        args: [NFT_ADDRESS, tokenId],
        value: parseEther(price),
      });
    } catch (error) {
      console.error('Error buying item:', error);
    }
    setBuying(null);
  };

  const tabs = [
    { id: 'browse', label: 'Explorar NFTs', icon: '🔍' },
    { id: 'create', label: 'Criar NFT', icon: '🎨' },
    { id: 'my-nfts', label: 'Meus NFTs', icon: '📦' },
    { id: 'activity', label: 'Atividade', icon: '📊' },
  ];

  return (
    <div className="nft-marketplace">
      <div className="marketplace-header">
        <h1>🎨 NexaStream NFT Marketplace</h1>
        <p>Mercado descentralizado para criadores de conteúdo</p>
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
        {activeTab === 'browse' && (
          <div className="browse-section">
            <h2>Explorar Coleções</h2>
            <div className="filters">
              <select>
                <option value="">Todas as categorias</option>
                <option value="streaming">Streaming</option>
                <option value="education">Educação</option>
                <option value="gaming">Gaming</option>
                <option value="music">Música</option>
              </select>
              <select>
                <option value="">Ordenar por</option>
                <option value="recent">Mais recentes</option>
                <option value="price-low">Menor preço</option>
                <option value="price-high">Maior preço</option>
              </select>
            </div>
            <div className="nft-grid">
              {/* Sample NFT cards */}
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="nft-card">
                  <div className="nft-image">🎬</div>
                  <div className="nft-info">
                    <h3>NexaStream Content #{i}</h3>
                    <p className="creator">Por @creator{i}</p>
                    <div className="nft-price">
                      <span className="price">{(0.1 * i).toFixed(2)} ETH</span>
                      <button 
                        className="buy-btn"
                        onClick={() => handleBuyItem(i, (0.1 * i).toString())}
                        disabled={buying === i || !isConnected}
                      >
                        {buying === i ? 'Comprando...' : 'Comprar'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'create' && (
          <div className="create-section">
            <h2>Criar Novo NFT</h2>
            <form className="create-form">
              <div className="form-group">
                <label>Upload de Mídia</label>
                <div className="upload-area">
                  <span>📤</span>
                  <p>Arraste arquivos ou clique para fazer upload</p>
                  <small>PNG, JPG, GIF, MP4 - Max 100MB</small>
                </div>
              </div>
              <div className="form-group">
                <label>Nome do NFT</label>
                <input type="text" placeholder="Ex: Exclusive Stream Access" />
              </div>
              <div className="form-group">
                <label>Descrição</label>
                <textarea placeholder="Descreva seu NFT..." rows={4}></textarea>
              </div>
              <div className="form-group">
                <label>Royalties (%)</label>
                <input type="number" min="0" max="10" step="0.1" placeholder="2.5" />
                <small>Você receberá este percentual em futuras vendas</small>
              </div>
              <div className="form-group">
                <label>Propriedades</label>
                <input type="text" placeholder="Ex: Streaming Access, Lifetime" />
              </div>
              <button type="submit" className="create-btn" disabled={minting}>
                {minting ? 'Criando...' : '🎨 Criar NFT'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'my-nfts' && (
          <div className="my-nfts-section">
            <h2>Meus NFTs</h2>
            {!isConnected ? (
              <div className="connect-prompt">
                <p>Conecte sua carteira para ver seus NFTs</p>
              </div>
            ) : (
              <div className="nft-grid">
                <div className="nft-card empty">
                  <div className="nft-image">🎬</div>
                  <div className="nft-info">
                    <h3>Meu Conteúdo #1</h3>
                    <p className="creator">Você criou</p>
                    <div className="nft-actions">
                      <button className="list-btn">Listar para Venda</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="activity-section">
            <h2>Atividade Recente</h2>
            <div className="activity-list">
              {[
                { type: 'sale', user: '0x1234...5678', nft: 'Content #1', price: '0.5 ETH', time: '2 mins ago' },
                { type: 'mint', user: '0xabcd...efgh', nft: 'Content #5', price: '-', time: '5 mins ago' },
                { type: 'bid', user: '0x9999...1111', nft: 'Content #3', price: '0.3 ETH', time: '10 mins ago' },
              ].map((activity, i) => (
                <div key={i} className="activity-item">
                  <span className="activity-icon">
                    {activity.type === 'sale' ? '💰' : activity.type === 'mint' ? '✨' : '🎯'}
                  </span>
                  <div className="activity-info">
                    <p>
                      <strong>{activity.user}</strong> {activity.type === 'sale' ? 'comprou' : activity.type === 'mint' ? 'criou' : 'apostou em'} {activity.nft}
                    </p>
                    <small>{activity.time}</small>
                  </div>
                  {activity.price !== '-' && <span className="activity-price">{activity.price}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .nft-marketplace {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }
        .marketplace-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .marketplace-header h1 {
          font-size: 2.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 0.5rem;
        }
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
          font-size: 1rem;
          transition: all 0.3s;
        }
        .tab:hover {
          border-color: #667eea;
          transform: translateY(-2px);
        }
        .tab.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
        .filters {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .filters select {
          padding: 0.75rem 1rem;
          border: 2px solid #eee;
          border-radius: 8px;
          font-size: 1rem;
        }
        .nft-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }
        .nft-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          transition: transform 0.3s;
        }
        .nft-card:hover {
          transform: translateY(-5px);
        }
        .nft-image {
          height: 200px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 4rem;
        }
        .nft-info { padding: 1.5rem; }
        .nft-info h3 {
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
        }
        .creator {
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }
        .nft-price {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .price {
          font-size: 1.2rem;
          font-weight: bold;
          color: #667eea;
        }
        .buy-btn {
          padding: 0.5rem 1rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
        .buy-btn:hover { background: #5a6fd6; }
        .buy-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .create-form { max-width: 600px; }
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
        .form-group small {
          display: block;
          margin-top: 0.25rem;
          color: #666;
          font-size: 0.85rem;
        }
        .upload-area {
          border: 2px dashed #667eea;
          border-radius: 12px;
          padding: 3rem;
          text-align: center;
          cursor: pointer;
        }
        .upload-area span { font-size: 3rem; }
        .upload-area p { margin: 1rem 0 0.5rem; }
        .create-btn {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: bold;
          cursor: pointer;
        }
        .create-btn:hover { opacity: 0.9; }
        .activity-list { display: flex; flex-direction: column; gap: 1rem; }
        .activity-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 12px;
        }
        .activity-icon { font-size: 2rem; }
        .activity-info { flex: 1; }
        .activity-price {
          font-weight: bold;
          color: #667eea;
        }
        .connect-prompt {
          text-align: center;
          padding: 3rem;
          background: #f8f9fa;
          border-radius: 12px;
        }
        .nft-actions { margin-top: 1rem; }
        .list-btn {
          width: 100%;
          padding: 0.75rem;
          background: white;
          border: 2px solid #667eea;
          color: #667eea;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
