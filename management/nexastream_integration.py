#!/usr/bin/env python3
"""
NexaStream OpenHands Integration
Permite gerenciar o NexaStream através de comandos do OpenHands
"""

import json
import sys
import os
from typing import Optional, List, Dict, Any

# Adicionar path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from nexastream_client import NexaStreamClient, Video, Channel


class NexaStreamManager:
    """
    Classe principal para gerenciar o NexaStream via OpenHands
    """
    
    def __init__(self):
        self.client = NexaStreamClient()
        self.connected = self.client.health_check()
    
    # ==================== STATUS ====================
    
    def status(self) -> Dict:
        """Retorna status da conexão"""
        return {
            'connected': self.connected,
            'platform': 'nexastream.org',
            'timestamp': self.client.get_statistics()['timestamp']
        }
    
    # ==================== ESTATÍSTICAS ====================
    
    def stats(self) -> Dict:
        """Retorna estatísticas completas"""
        return self.client.get_statistics()
    
    def stats_summary(self) -> str:
        """Retorna resumo em formato legível"""
        stats = self.client.get_statistics()
        p = stats['platform']
        
        return f"""
╔═══════════════════════════════════════════════════════════╗
║               NEXASTREAM - ESTATÍSTICAS                 ║
╠═══════════════════════════════════════════════════════════╣
║  🎬  Vídeos:          {p['total_videos']:<33}║
║  👥  Canais:          {p['total_channels']:<33}║
║  👁️  Total Views:     {p['total_views']:>30,}║
║  ❤️  Total Likes:     {p['total_likes']:>30,}║
║  💬  Total Comments:  {p['total_comments']:>30,}║
║  💰  Ganhos:          ${p['total_earnings_usdc']:>28,.2f} USDC║
║  📈  Inscritos:       {p['total_subscribers']:>30,}║
╚═══════════════════════════════════════════════════════════╝
        """
    
    # ==================== VÍDEOS ====================
    
    def list_videos(self, limit: int = 10, sort_by: str = 'views') -> List[Dict]:
        """Lista vídeos"""
        videos = self.client.get_videos()
        
        if sort_by == 'views':
            videos.sort(key=lambda v: v.viewCount, reverse=True)
        elif sort_by == 'earnings':
            videos.sort(key=lambda v: v.earningsUsdc, reverse=True)
        elif sort_by == 'likes':
            videos.sort(key=lambda v: v.likeCount, reverse=True)
        
        return [v.__dict__ for v in videos[:limit]]
    
    def get_video(self, video_id: int) -> Dict:
        """Retorna detalhes de um vídeo"""
        video = self.client.get_video(video_id)
        return video.__dict__
    
    def search_videos(self, query: str) -> List[Dict]:
        """Busca vídeos"""
        videos = self.client.search_videos(query)
        return [v.__dict__ for v in videos]
    
    def boost_video(self, video_id: int, level: int = 1) -> Dict:
        """Aumenta boost de um vídeo"""
        try:
            video = self.client.boost_video(video_id, level)
            return {'success': True, 'video_id': video_id, 'boost_level': level}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def feature_video(self, video_id: int) -> Dict:
        """Destaca um vídeo"""
        try:
            video = self.client.feature_video(video_id)
            return {'success': True, 'video_id': video_id, 'featured': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def videos_table(self, limit: int = 10) -> str:
        """Retorna tabela de vídeos formatada"""
        videos = self.list_videos(limit)
        
        if not videos:
            return "Nenhum vídeo encontrado."
        
        header = f"{'#':<3} {'Título':<50} {'Views':<12} {'Likes':<10} {'Ganhos':<12}"
        separator = "─" * 100
        rows = []
        
        for i, v in enumerate(videos, 1):
            title = v['title'][:47] + '...' if len(v['title']) > 50 else v['title']
            row = f"{i:<3} {title:<50} {v['viewCount']:>10,} {v['likeCount']:>8,} ${v['earningsUsdc']:>9.2f}"
            rows.append(row)
        
        return "\n".join([header, separator] + rows)
    
    # ==================== CANAIS ====================
    
    def list_channels(self, limit: int = 10, sort_by: str = 'subscribers') -> List[Dict]:
        """Lista canais"""
        channels = self.client.get_channels()
        
        if sort_by == 'subscribers':
            channels.sort(key=lambda c: c.subscriberCount, reverse=True)
        elif sort_by == 'earnings':
            channels.sort(key=lambda c: c.totalEarningsUsdc, reverse=True)
        
        return [c.__dict__ for c in channels[:limit]]
    
    def get_channel(self, channel_id: int) -> Dict:
        """Retorna detalhes de um canal"""
        channel = self.client.get_channel(channel_id)
        return channel.__dict__
    
    def channel_analytics(self, channel_id: int) -> Dict:
        """Retorna analytics de um canal"""
        return self.client.get_channel_analytics(channel_id)
    
    def channels_table(self, limit: int = 10) -> str:
        """Retorna tabela de canais formatada"""
        channels = self.list_channels(limit)
        
        if not channels:
            return "Nenhum canal encontrado."
        
        header = f"{'#':<3} {'Nome':<25} {'Slug':<20} {'Inscritos':<12} {'Vídeos':<8} {'Ganhos':<15}"
        separator = "─" * 95
        rows = []
        
        for i, c in enumerate(channels, 1):
            name = c['name'][:22] + '..' if len(c['name']) > 24 else c['name']
            row = f"{i:<3} {name:<25} @{c['slug']:<19} {c['subscriberCount']:>10,} {c['videoCount']:>6} ${c['totalEarningsUsdc']:>12,.2f}"
            rows.append(row)
        
        return "\n".join([header, separator] + rows)
    
    # ==================== TENDÊNCIAS ====================
    
    def trending(self, limit: int = 10) -> List[Dict]:
        """Retorna vídeos em tendência"""
        videos = self.client.get_trending_videos()
        return [v.__dict__ for v in videos[:limit]]
    
    def trending_table(self, limit: int = 10) -> str:
        """Retorna tabela de tendências formatada"""
        videos = self.trending(limit)
        
        if not videos:
            return "Nenhum vídeo em tendência."
        
        header = f"{'#':<3} {'🔥':<3} {'Título':<47} {'Views':<12} {'Boost':<6}"
        separator = "─" * 80
        rows = []
        
        for i, v in enumerate(videos, 1):
            title = v['title'][:44] + '..' if len(v['title']) > 46 else v['title']
            row = f"{i:<3} 🔥  {title:<47} {v['viewCount']:>10,} {v['boostLevel']:>4}"
            rows.append(row)
        
        return "\n".join([header, separator] + rows)
    
    # ==================== FEED ====================
    
    def feed(self, feed_type: str = 'all') -> List[Dict]:
        """Retorna feed"""
        if feed_type == 'for-you':
            videos = self.client.get_for_you_feed()
        elif feed_type == 'trending':
            videos = self.client.get_trending_feed()
        elif feed_type == 'new':
            videos = self.client.get_new_creators_feed()
        else:
            videos = self.client.get_feed()
        
        return [v.__dict__ for v in videos]
    
    # ==================== RELATÓRIOS ====================
    
    def report(self) -> str:
        """Gera relatório completo"""
        stats = self.stats()
        channels = self.list_channels(4)
        videos = self.list_videos(5, 'views')
        trending = self.trending(5)
        
        top_channel = channels[0] if channels else {}
        top_video = videos[0] if videos else {}
        top_trending = trending[0] if trending else {}
        
        return f"""
╔═══════════════════════════════════════════════════════════════════════╗
║                    NEXASTREAM - RELATÓRIO COMPLETO                    ║
║                        Gerado: {stats['timestamp'][:19]:<28}║
╠═══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  📊 RESUMO DA PLATAFORMA                                             ║
║  ─────────────────────────────────────────────────────────────────── ║
║  • Total de Vídeos:     {stats['platform']['total_videos']:<42}║
║  • Total de Canais:     {stats['platform']['total_channels']:<42}║
║  • Visualizações:       {stats['platform']['total_views']:>40,}║
║  • Ganhos Totais:       ${stats['platform']['total_earnings_usdc']:>39,.2f} USDC║
║  • Total Inscritos:     {stats['platform']['total_subscribers']:>40,}║
║                                                                       ║
║  🏆 TOP CANAL                                                        ║
║  ─────────────────────────────────────────────────────────────────── ║
║  • Nome:          {top_channel.get('name', 'N/A'):<47}║
║  • Inscritos:    {top_channel.get('subscriberCount', 0):>46,}║
║  • Ganhos:       ${top_channel.get('totalEarningsUsdc', 0):>45,.2f} USDC║
║                                                                       ║
║  🎬 TOP VÍDEO                                                        ║
║  ─────────────────────────────────────────────────────────────────── ║
║  • Título:       {top_video.get('title', 'N/A')[:46]:<47}║
║  • Views:        {top_video.get('viewCount', 0):>46,}║
║  • Ganhos:       ${top_video.get('earningsUsdc', 0):>45,.2f} USDC║
║                                                                       ║
║  🔥 EM TENDÊNCIA                                                     ║
║  ─────────────────────────────────────────────────────────────────── ║
║  • Título:       {top_trending.get('title', 'N/A')[:46]:<47}║
║  • Boost Level:  {top_trending.get('boostLevel', 0):>46}║
║  • Views:        {top_trending.get('viewCount', 0):>46,}║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
        """
    
    # ==================== COMANDOS CLI ====================
    
    def execute_command(self, command: str, args: Dict = None) -> Dict:
        """Executa um comando"""
        args = args or {}
        
        commands = {
            'status': lambda: self.status(),
            'stats': lambda: self.stats(),
            'stats-summary': lambda: {'text': self.stats_summary()},
            'videos': lambda: self.list_videos(args.get('limit', 10), args.get('sort', 'views')),
            'videos-table': lambda: {'text': self.videos_table(args.get('limit', 10))},
            'video': lambda: self.get_video(args.get('id')),
            'video-boost': lambda: self.boost_video(args.get('id'), args.get('level', 1)),
            'video-feature': lambda: self.feature_video(args.get('id')),
            'channels': lambda: self.list_channels(args.get('limit', 10), args.get('sort', 'subscribers')),
            'channels-table': lambda: {'text': self.channels_table(args.get('limit', 10))},
            'channel': lambda: self.get_channel(args.get('id')),
            'channel-analytics': lambda: self.channel_analytics(args.get('id')),
            'trending': lambda: self.trending(args.get('limit', 10)),
            'trending-table': lambda: {'text': self.trending_table(args.get('limit', 10))},
            'feed': lambda: self.feed(args.get('type', 'all')),
            'search': lambda: self.search_videos(args.get('query', '')),
            'report': lambda: {'text': self.report()},
        }
        
        if command in commands:
            try:
                result = commands[command]()
                return {'success': True, 'data': result}
            except Exception as e:
                return {'success': False, 'error': str(e)}
        
        return {'success': False, 'error': f'Comando desconhecido: {command}'}


# ==================== MAIN ====================

def main():
    if len(sys.argv) < 2:
        print("""
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎬 NexaStream Manager - OpenHands Integration           ║
║                                                           ║
║   Uso: python nexastream_integration.py <comando>         ║
║                                                           ║
║   Comandos disponíveis:                                  ║
║   ─────────────────────────────────────────────────────── ║
║   status              - Verificar status da conexão      ║
║   stats               - Estatísticas completas            ║
║   stats-summary       - Resumo em tabela                  ║
║   videos              - Listar vídeos                     ║
║   videos-table        - Tabela de vídeos                   ║
║   video <id>          - Detalhes de um vídeo              ║
║   video-boost <id>    - Boost um vídeo                    ║
║   video-feature <id>  - Destacar um vídeo                ║
║   channels            - Listar canais                     ║
║   channels-table      - Tabela de canais                  ║
║   channel <id>        - Detalhes de um canal             ║
║   trending            - Vídeos em tendência               ║
║   trending-table      - Tabela de tendências              ║
║   search <query>      - Buscar vídeos                     ║
║   feed                - Feed principal                    ║
║   report              - Relatório completo                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
        """)
        sys.exit(1)
    
    manager = NexaStreamManager()
    
    if not manager.connected:
        print("❌ Erro: Não foi possível conectar ao NexaStream")
        sys.exit(1)
    
    command = sys.argv[1]
    args = {}
    
    # Parse arguments
    for i, arg in enumerate(sys.argv[2:], 1):
        if arg.isdigit():
            args['id'] = int(arg)
        elif arg.startswith('--'):
            parts = arg[2:].split('=')
            if len(parts) == 2:
                key, value = parts
                args[key] = value
    
    if 'limit' in args and isinstance(args['limit'], str):
        args['limit'] = int(args['limit'])
    
    if command == 'search' and len(sys.argv) > 2:
        args['query'] = sys.argv[2]
    
    result = manager.execute_command(command, args)
    
    if result['success']:
        if 'text' in result['data']:
            print(result['data']['text'])
        else:
            print(json.dumps(result['data'], indent=2, default=str))
    else:
        print(f"❌ Erro: {result['error']}")
        sys.exit(1)


if __name__ == "__main__":
    main()
