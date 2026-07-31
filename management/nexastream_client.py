"""
NexaStream Management Client
Conexão completa com a API do NexaStream para gerenciamento
"""

import json
import time
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, asdict
from enum import Enum

try:
    import requests
except ImportError:
    import subprocess
    subprocess.check_call(['pip', 'install', 'requests', '-q'])
    import requests


class VideoStatus(Enum):
    PUBLISHED = "published"
    DRAFT = "draft"
    PROCESSING = "processing"
    FAILED = "failed"


@dataclass
class Video:
    id: int
    channelId: int
    title: str
    description: str
    thumbnailUrl: str
    videoUrl: Optional[str]
    status: str
    viewCount: int
    likeCount: int
    commentCount: int
    earningsUsdc: float
    durationSeconds: int
    category: str
    tags: str
    language: str
    isMonetized: bool
    boostLevel: int
    publishedAt: str
    createdAt: str
    updatedAt: str
    channelName: Optional[str] = None
    channelAvatarUrl: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict) -> 'Video':
        return cls(**data)

    def get_thumbnail(self) -> str:
        return self.thumbnailUrl

    def get_duration_formatted(self) -> str:
        minutes = self.durationSeconds // 60
        seconds = self.durationSeconds % 60
        return f"{minutes}:{seconds:02d}"

    def get_ctr(self) -> float:
        """Calculate engagement rate"""
        if self.viewCount == 0:
            return 0
        return round((self.likeCount + self.commentCount) / self.viewCount * 100, 2)


@dataclass
class Channel:
    id: int
    userId: int
    name: str
    slug: str
    description: str
    avatarUrl: str
    bannerUrl: str
    subscriberCount: int
    videoCount: int
    totalEarningsUsdc: float
    isMonetized: bool
    category: str
    createdAt: str
    updatedAt: str
    videos: Optional[List[Video]] = None

    @classmethod
    def from_dict(cls, data: Dict) -> 'Channel':
        return cls(**data)

    def get_avg_earnings_per_video(self) -> float:
        if self.videoCount == 0:
            return 0
        return round(self.totalEarningsUsdc / self.videoCount, 2)


class NexaStreamClient:
    """
    Cliente oficial para gerenciamento da plataforma NexaStream
    """
    
    BASE_URL = "https://nexastream.org/api"
    
    def __init__(self, api_key: Optional[str] = None, admin_token: Optional[str] = None):
        self.api_key = api_key
        self.admin_token = admin_token
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'NexaStream-Management-Client/1.0'
        })
        if api_key:
            self.session.headers['Authorization'] = f'Bearer {api_key}'
        
        # Cache
        self._videos_cache = None
        self._channels_cache = None
        self._cache_time = 0
        self._cache_ttl = 60  # 1 minute cache
    
    def _get(self, endpoint: str, use_cache: bool = True) -> Dict:
        """Faz requisição GET"""
        cache_key = f"{endpoint}_cache"
        cache_attr = f"_{cache_key}"
        
        if use_cache and hasattr(self, cache_attr):
            cached = getattr(self, cache_attr)
            if cached and time.time() - self._cache_time < self._cache_ttl:
                return cached
        
        response = self.session.get(f"{self.BASE_URL}/{endpoint}")
        response.raise_for_status()
        data = response.json()
        
        if use_cache:
            setattr(self, cache_attr, data)
            self._cache_time = time.time()
        
        return data
    
    def _post(self, endpoint: str, data: Dict = None) -> Dict:
        """Faz requisição POST"""
        response = self.session.post(
            f"{self.BASE_URL}/{endpoint}",
            json=data or {}
        )
        response.raise_for_status()
        return response.json() if response.text else {}
    
    def _put(self, endpoint: str, data: Dict) -> Dict:
        """Faz requisição PUT"""
        response = self.session.put(
            f"{self.BASE_URL}/{endpoint}",
            json=data
        )
        response.raise_for_status()
        return response.json() if response.text else {}
    
    def _delete(self, endpoint: str) -> bool:
        """Faz requisição DELETE"""
        response = self.session.delete(f"{self.BASE_URL}/{endpoint}")
        return response.status_code == 200
    
    # ==================== VÍDEOS ====================
    
    def get_videos(self, use_cache: bool = True) -> List[Video]:
        """Retorna todos os vídeos"""
        data = self._get("videos", use_cache)
        return [Video.from_dict(v) for v in data]
    
    def get_video(self, video_id: int) -> Video:
        """Retorna um vídeo específico"""
        data = self._get(f"videos/{video_id}")
        return Video.from_dict(data)
    
    def get_trending_videos(self) -> List[Video]:
        """Retorna vídeos em tendência"""
        data = self._get("videos/trending")
        return [Video.from_dict(v) for v in data]
    
    def search_videos(self, query: str) -> List[Video]:
        """Busca vídeos"""
        data = self._get(f"search?q={query}")
        return [Video.from_dict(v) for v in data.get('results', [])]
    
    def create_video(self, video_data: Dict) -> Video:
        """Cria um novo vídeo"""
        data = self._post("videos", video_data)
        return Video.from_dict(data)
    
    def update_video(self, video_id: int, video_data: Dict) -> Video:
        """Atualiza um vídeo"""
        data = self._put(f"videos/{video_id}", video_data)
        return Video.from_dict(data)
    
    def delete_video(self, video_id: int) -> bool:
        """Deleta um vídeo"""
        return self._delete(f"videos/{video_id}")
    
    def boost_video(self, video_id: int, level: int = 1) -> Video:
        """Aumenta o boost de um vídeo"""
        return self.update_video(video_id, {'boostLevel': level})
    
    # ==================== CANAIS ====================
    
    def get_channels(self, use_cache: bool = True) -> List[Channel]:
        """Retorna todos os canais"""
        data = self._get("channels", use_cache)
        return [Channel.from_dict(c) for c in data]
    
    def get_channel(self, channel_id: int) -> Channel:
        """Retorna um canal específico"""
        data = self._get(f"channels/{channel_id}")
        return Channel.from_dict(data)
    
    def get_channel_videos(self, channel_id: int) -> List[Video]:
        """Retorna vídeos de um canal"""
        data = self._get(f"channels/{channel_id}/videos")
        return [Video.from_dict(v) for v in data]
    
    def create_channel(self, channel_data: Dict) -> Channel:
        """Cria um novo canal"""
        data = self._post("channels", channel_data)
        return Channel.from_dict(data)
    
    def update_channel(self, channel_id: int, channel_data: Dict) -> Channel:
        """Atualiza um canal"""
        data = self._put(f"channels/{channel_id}", channel_data)
        return Channel.from_dict(data)
    
    # ==================== FEED ====================
    
    def get_feed(self) -> List[Video]:
        """Retorna o feed personalizado"""
        data = self._get("feed")
        return [Video.from_dict(v) for v in data]
    
    def get_for_you_feed(self) -> List[Video]:
        """Retorna feed 'For You'"""
        data = self._get("feed?type=for-you")
        return [Video.from_dict(v) for v in data]
    
    def get_trending_feed(self) -> List[Video]:
        """Retorna feed de tendências"""
        data = self._get("feed?type=trending")
        return [Video.from_dict(v) for v in data]
    
    def get_new_creators_feed(self) -> List[Video]:
        """Retorna feed de novos criadores"""
        data = self._get("feed?type=new-creators")
        return [Video.from_dict(v) for v in data]
    
    # ==================== ESTATÍSTICAS ====================
    
    def get_statistics(self) -> Dict:
        """Retorna estatísticas globais da plataforma"""
        videos = self.get_videos()
        channels = self.get_channels()
        
        total_views = sum(v.viewCount for v in videos)
        total_likes = sum(v.likeCount for v in videos)
        total_comments = sum(v.commentCount for v in videos)
        total_earnings = sum(v.earningsUsdc for v in videos)
        total_subscribers = sum(c.subscriberCount for c in channels)
        
        return {
            'platform': {
                'name': 'NexaStream',
                'total_videos': len(videos),
                'total_channels': len(channels),
                'total_views': total_views,
                'total_likes': total_likes,
                'total_comments': total_comments,
                'total_earnings_usdc': round(total_earnings, 2),
                'total_subscribers': total_subscribers,
            },
            'avg_per_video': {
                'views': round(total_views / len(videos), 0) if videos else 0,
                'likes': round(total_likes / len(videos), 0) if videos else 0,
                'earnings': round(total_earnings / len(videos), 2) if videos else 0,
            },
            'top_video': max(videos, key=lambda v: v.viewCount).__dict__ if videos else None,
            'top_earner': max(videos, key=lambda v: v.earningsUsdc).__dict__ if videos else None,
            'timestamp': datetime.now().isoformat()
        }
    
    def get_channel_analytics(self, channel_id: int) -> Dict:
        """Retorna analytics de um canal"""
        channel = self.get_channel(channel_id)
        videos = self.get_channel_videos(channel_id)
        
        return {
            'channel': asdict(channel),
            'analytics': {
                'total_videos': len(videos),
                'total_views': sum(v.viewCount for v in videos),
                'total_earnings': sum(v.earningsUsdc for v in videos),
                'avg_ctr': round(sum(v.get_ctr() for v in videos) / len(videos), 2) if videos else 0,
                'avg_duration': round(sum(v.durationSeconds for v in videos) / len(videos), 0) if videos else 0,
            },
            'top_performing_video': max(videos, key=lambda v: v.viewCount).__dict__ if videos else None,
            'recent_videos': [asdict(v) for v in sorted(videos, key=lambda v: v.publishedAt, reverse=True)[:5]]
        }
    
    # ==================== MODERAÇÃO ====================
    
    def moderate_video(self, video_id: int, action: str) -> Dict:
        """Aplica moderação a um vídeo"""
        # action: 'approve', 'reject', 'feature', 'hide'
        return self._post(f"moderation/video/{video_id}", {'action': action})
    
    def feature_video(self, video_id: int) -> Video:
        """Destaca um vídeo"""
        return self.update_video(video_id, {'boostLevel': 5})
    
    def hide_video(self, video_id: int) -> Video:
        """Oculta um vídeo"""
        return self.update_video(video_id, {'status': 'hidden'})
    
    def report_video(self, video_id: int, reason: str) -> Dict:
        """Reporta um vídeo"""
        return self._post(f"reports/video/{video_id}", {'reason': reason})
    
    # ==================== AUTENTICAÇÃO (ADMIN) ====================
    
    def login(self, email: str, password: str) -> Dict:
        """Faz login como admin"""
        return self._post("auth/login", {'email': email, 'password': password})
    
    def register(self, user_data: Dict) -> Dict:
        """Registra novo usuário/admin"""
        return self._post("auth/register", user_data)
    
    def get_current_user(self) -> Dict:
        """Retorna usuário atual"""
        return self._get("auth/me")
    
    # ==================== GANANCIAS ====================
    
    def get_earnings(self) -> Dict:
        """Retorna ganhos da plataforma"""
        return self._get("earnings")
    
    def get_earnings_history(self) -> List[Dict]:
        """Retorna histórico de ganhos"""
        return self._get("earnings/history")
    
    def get_creator_payouts(self, channel_id: int) -> List[Dict]:
        """Retorna pagamentos de um criador"""
        return self._get(f"earnings/channel/{channel_id}/payouts")
    
    # ==================== UTILIDADES ====================
    
    def clear_cache(self):
        """Limpa o cache"""
        self._videos_cache = None
        self._channels_cache = None
        self._cache_time = 0
    
    def health_check(self) -> bool:
        """Verifica se a API está online"""
        try:
            self._get("videos", use_cache=False)
            return True
        except:
            return False


# ==================== EXPORTS ====================

__all__ = ['NexaStreamClient', 'Video', 'Channel', 'VideoStatus']
