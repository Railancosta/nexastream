#!/usr/bin/env python3
"""
NexaStream Management CLI
Interface de linha de comando para gerenciar a plataforma NexaStream
"""

import sys
import os
from datetime import datetime

# Adicionar path para imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from nexastream_client import NexaStreamClient, Video, Channel

# Cores ANSI
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def color(text: str, col: str) -> str:
    return f"{col}{text}{Colors.ENDC}"

def print_banner():
    banner = f"""
{Colors.CYAN}╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   {Colors.BOLD}███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗{Colors.ENDC}{Colors.CYAN}           ║
║   {Colors.BOLD}████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝{Colors.ENDC}{Colors.CYAN}           ║
║   {Colors.BOLD}██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗{Colors.ENDC}{Colors.CYAN}           ║
║   {Colors.BOLD}██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║{Colors.ENDC}{Colors.CYAN}           ║
║   {Colors.BOLD}██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║{Colors.ENDC}{Colors.CYAN}           ║
║   {Colors.BOLD}╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝{Colors.ENDC}{Colors.CYAN}           ║
║                                                              ║
║   {Colors.BOLD}📺 Platform Management Console v1.0{Colors.ENDC}{Colors.CYAN}                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝{Colors.ENDC}
"""
    print(banner)

def print_menu():
    menu = f"""
{Colors.BOLD}📋 MENU PRINCIPAL:{Colors.ENDC}

  {Colors.GREEN}[1]{Colors.ENDC} 📊  Estatísticas da Plataforma
  {Colors.GREEN}[2]{Colors.ENDC} 🎬  Gerenciar Vídeos
  {Colors.GREEN}[3]{Colors.ENDC} 👥  Gerenciar Canais
  {Colors.GREEN}[4]{Colors.ENDC} 📈  Analytics Detalhado
  {Colors.GREEN}[5]{Colors.ENDC} 🔍  Buscar Conteúdo
  {Colors.GREEN}[6]{Colors.ENDC} 🛡️  Moderação
  {Colors.GREEN}[7]{Colors.ENDC} ⚙️  Configurações
  {Colors.GREEN}[8]{Colors.ENDC} 🔄  Atualizar Cache
  {Colors.GREEN}[0]{Colors.ENDC} 🚪  Sair

"""
    print(menu)

def print_video(video: Video, index: int = None):
    idx = f"{Colors.YELLOW}[{index}]{Colors.ENDC} " if index else "   "
    print(f"""
{idx}{Colors.BOLD}{video.title[:60]}{Colors.ENDC}
    👤 {video.channelName or 'Unknown'}  👁️ {video.viewCount:,} views  ❤️ {video.likeCount:,}  💬 {video.commentCount:,}
    💰 ${video.earningsUsdc:.2f} USDC  ⏱️ {video.get_duration_formatted()}  📅 {video.publishedAt[:10]}
    🏷️  {video.tags or 'Sem tags'}
    📊 CTR: {video.get_ctr()}%  🔥 Boost: {video.boostLevel}
""")

def print_channel(channel: Channel, index: int = None):
    idx = f"{Colors.YELLOW}[{index}]{Colors.ENDC} " if index else "   "
    print(f"""
{idx}{Colors.BOLD}{channel.name}{Colors.ENDC} (@{channel.slug})
    📺 {channel.videoCount} vídeos  👥 {channel.subscriberCount:,} inscritos
    💰 ${channel.totalEarningsUsdc:,.2f} USDC  📁 {channel.category}
    ✅ Monetizado: {'Sim' if channel.isMonetized else 'Não'}
""")

def statistics_menu(client: NexaStreamClient):
    while True:
        print(f"\n{Colors.BOLD}📊 ESTATÍSTICAS{Colors.ENDC}\n")
        
        stats = client.get_statistics()
        platform = stats['platform']
        
        print(f"""
{Colors.CYAN}┌─────────────────────────────────────────────────────────┐
│                    PLATAFORMA NEXASTREAM                    │
├─────────────────────────────────────────────────────────────┤
│  🎬  Vídeos:           {platform['total_videos']:<35}│
│  👥  Canais:           {platform['total_channels']:<35}│
│  👁️  Total de Views:   {platform['total_views']:>30,}│
│  ❤️  Total de Likes:   {platform['total_likes']:>30,}│
│  💬  Total Comments:   {platform['total_comments']:>30,}│
│  💰  Ganhos Totais:    ${platform['total_earnings_usdc']:>28,.2f} USDC│
│  📈  Total Inscritos:  {platform['total_subscribers']:>30,}│
├─────────────────────────────────────────────────────────────┤
│                      MÉDIAS POR VÍDEO                       │
├─────────────────────────────────────────────────────────────┤
│  👁️  Views médio:      {stats['avg_per_video']['views']:>30,.0f}│
│  ❤️  Likes médio:      {stats['avg_per_video']['likes']:>30,.0f}│
│  💰  Ganhos médio:     ${stats['avg_per_video']['earnings']:>28,.2f}│
└─────────────────────────────────────────────────────────────┘{Colors.ENDC}
""")
        
        print(f"{Colors.BOLD}🏆 TOP VÍDEO:{Colors.ENDC}")
        top = stats['top_video']
        if top:
            print(f"   {top['title'][:50]}")
            print(f"   👁️ {top['viewCount']:,} views  💰 ${top['earningsUsdc']:.2f} USDC")
        
        print(f"\n{Colors.BOLD}💎 TOP GANHADOR:{Colors.ENDC}")
        top_earn = stats['top_earner']
        if top_earn:
            print(f"   {top_earn['title'][:50]}")
            print(f"   💰 ${top_earn['earningsUsdc']:.2f} USDC")
        
        print(f"\n{Colors.YELLOW}[0] Voltar ao menu principal{Colors.ENDC}")
        
        choice = input(f"\n{Colors.CYAN}>>> {Colors.ENDC}").strip()
        if choice == '0':
            break

def videos_menu(client: NexaStreamClient):
    while True:
        print(f"\n{Colors.BOLD}🎬 GERENCIAR VÍDEOS{Colors.ENDC}\n")
        
        videos = client.get_videos()
        
        print(f"{Colors.CYAN}┌────┬─────────────────────────────────────────────┬─────────────┬────────────┐{Colors.ENDC}")
        print(f"{Colors.CYAN}│ #  │ Título                                     │ Views       │ Ganhos     │{Colors.ENDC}")
        print(f"{Colors.CYAN}├────┼─────────────────────────────────────────────┼─────────────┼────────────┤{Colors.ENDC}")
        
        for i, v in enumerate(sorted(videos, key=lambda x: x.viewCount, reverse=True), 1):
            title = v.title[:43] + '...' if len(v.title) > 43 else v.title
            print(f"{Colors.CYAN}│{Colors.ENDC} {Colors.YELLOW}{i:>2}{Colors.ENDC} │ {title:<45} │ {v.viewCount:>10,} │ ${v.earningsUsdc:>9.2f} │")
        
        print(f"{Colors.CYAN}└────┴─────────────────────────────────────────────┴─────────────┴────────────┘{Colors.ENDC}")
        
        print(f"""
{Colors.GREEN}[1]{Colors.ENDC}-{Colors.GREEN}[{len(videos)}]{Colors.ENDC} Selecionar vídeo
{Colors.GREEN}[A]{Colors.ENDC} Ordenar por views
{Colors.GREEN}[B]{Colors.ENDC} Ordenar por ganhos
{Colors.GREEN}[C]{Colors.ENDC} Ordenar por likes
{Colors.GREEN}[T]{Colors.ENDC} Ver vídeos em tendência
{Colors.GREEN}[0]{Colors.ENDC} Voltar
""")
        
        choice = input(f"{Colors.CYAN}>>> {Colors.ENDC}").strip().upper()
        
        if choice == '0':
            break
        elif choice == 'T':
            trending = client.get_trending_videos()
            print(f"\n{Colors.BOLD}🔥 VÍDEOS EM TENDÊNCIA:{Colors.ENDC}")
            for i, v in enumerate(trending, 1):
                print_video(v, i)
        elif choice.isdigit() and 1 <= int(choice) <= len(videos):
            video_detail_menu(client, videos[int(choice) - 1])
        elif choice == 'A':
            videos = sorted(videos, key=lambda x: x.viewCount, reverse=True)
        elif choice == 'B':
            videos = sorted(videos, key=lambda x: x.earningsUsdc, reverse=True)
        elif choice == 'C':
            videos = sorted(videos, key=lambda x: x.likeCount, reverse=True)

def video_detail_menu(client: NexaStreamClient, video: Video):
    while True:
        print(f"\n{Colors.BOLD}🎬 DETALHES DO VÍDEO{Colors.ENDC}\n")
        print_video(video)
        
        print(f"""
{Colors.GREEN}[1]{Colors.ENDC} 🚀 Aumentar Boost
{Colors.GREEN}[2]{Colors.ENDC} ⭐ Destacar (Boost Máximo)
{Colors.GREEN}[3]{Colors.ENDC} 👁️ Ver detalhes completos
{Colors.GREEN}[4]{Colors.ENDC} 🔗 Copiar link
{Colors.GREEN}[5]{Colors.ENDC} 📊 Ver analytics
{Colors.GREEN}[0]{Colors.ENDC} Voltar
""")
        
        choice = input(f"{Colors.CYAN}>>> {Colors.ENDC}").strip()
        
        if choice == '0':
            break
        elif choice == '1':
            new_level = min(video.boostLevel + 1, 5)
            try:
                updated = client.boost_video(video.id, new_level)
                print(f"{Colors.GREEN}✅ Boost atualizado para {new_level}{Colors.ENDC}")
                video = updated
            except Exception as e:
                print(f"{Colors.RED}❌ Erro: {e}{Colors.ENDC}")
        elif choice == '2':
            try:
                updated = client.feature_video(video.id)
                print(f"{Colors.GREEN}✅ Vídeo destacado!{Colors.ENDC}")
                video = updated
            except Exception as e:
                print(f"{Colors.RED}❌ Erro: {e}{Colors.ENDC}")
        elif choice == '3':
            print(f"\n{Colors.CYAN}--- INFORMAÇÕES COMPLETAS ---{Colors.ENDC}")
            print(f"ID: {video.id}")
            print(f"Channel ID: {video.channelId}")
            print(f"Status: {video.status}")
            print(f"Description: {video.description[:100]}...")
            print(f"Tags: {video.tags}")
            print(f"Language: {video.language}")
            print(f"Category: {video.category}")
            print(f"Created: {video.createdAt}")
            print(f"Updated: {video.updatedAt}")
            input(f"\n{Colors.YELLOW}Pressione ENTER para continuar...{Colors.ENDC}")
        elif choice == '4':
            print(f"\n{Colors.GREEN}🔗 https://nexastream.org/watch/{video.id}{Colors.ENDC}")
            input(f"\n{Colors.YELLOW}Pressione ENTER para continuar...{Colors.ENDC}")

def channels_menu(client: NexaStreamClient):
    while True:
        print(f"\n{Colors.BOLD}👥 GERENCIAR CANAIS{Colors.ENDC}\n")
        
        channels = client.get_channels()
        
        print(f"{Colors.CYAN}┌────┬─────────────────────┬───────────┬───────────┬────────────┐{Colors.ENDC}")
        print(f"{Colors.CYAN}│ #  │ Nome                │ Inscritos │ Vídeos    │ Ganhos     │{Colors.ENDC}")
        print(f"{Colors.CYAN}├────┼─────────────────────┼───────────┼───────────┼────────────┤{Colors.ENDC}")
        
        for i, c in enumerate(sorted(channels, key=lambda x: x.subscriberCount, reverse=True), 1):
            name = c.name[:19] + '..' if len(c.name) > 19 else c.name
            print(f"{Colors.CYAN}│{Colors.ENDC} {Colors.YELLOW}{i:>2}{Colors.ENDC} │ {name:<19} │ {c.subscriberCount:>9,} │ {c.videoCount:>9} │ ${c.totalEarningsUsdc:>10,.2f} │")
        
        print(f"{Colors.CYAN}└────┴─────────────────────┴───────────┴───────────┴────────────┘{Colors.ENDC}")
        
        print(f"""
{Colors.GREEN}[1]{Colors.ENDC}-{Colors.GREEN}[{len(channels)}]{Colors.ENDC} Selecionar canal
{Colors.GREEN}[A]{Colors.ENDC} Ordenar por inscritos
{Colors.GREEN}[B]{Colors.ENDC} Ordenar por ganhos
{Colors.GREEN}[0]{Colors.ENDC} Voltar
""")
        
        choice = input(f"{Colors.CYAN}>>> {Colors.ENDC}").strip().upper()
        
        if choice == '0':
            break
        elif choice.isdigit() and 1 <= int(choice) <= len(channels):
            channel_detail_menu(client, channels[int(choice) - 1])
        elif choice == 'A':
            channels = sorted(channels, key=lambda x: x.subscriberCount, reverse=True)
        elif choice == 'B':
            channels = sorted(channels, key=lambda x: x.totalEarningsUsdc, reverse=True)

def channel_detail_menu(client: NexaStreamClient, channel: Channel):
    while True:
        print(f"\n{Colors.BOLD}👤 DETALHES DO CANAL{Colors.ENDC}\n")
        print_channel(channel)
        
        print(f"""
{Colors.GREEN}[1]{Colors.ENDC} 📊 Ver analytics completos
{Colors.GREEN}[2]{Colors.ENDC} 🎬 Ver vídeos do canal
{Colors.GREEN}[3]{Colors.ENDC} 💰 Ver ganhos detalhados
{Colors.GREEN}[0]{Colors.ENDC} Voltar
""")
        
        choice = input(f"{Colors.CYAN}>>> {Colors.ENDC}").strip()
        
        if choice == '0':
            break
        elif choice == '1':
            try:
                analytics = client.get_channel_analytics(channel.id)
                print(f"\n{Colors.BOLD}📊 ANALYTICS DE {channel.name.upper()}{Colors.ENDC}\n")
                a = analytics['analytics']
                print(f"Total de Vídeos: {a['total_videos']}")
                print(f"Total de Views: {a['total_views']:,}")
                print(f"Ganhos Totais: ${a['total_earnings']:.2f} USDC")
                print(f"CTR Médio: {a['avg_ctr']}%")
                print(f"Duração Média: {a['avg_duration']:.0f} segundos")
            except Exception as e:
                print(f"{Colors.RED}❌ Erro: {e}{Colors.ENDC}")
            input(f"\n{Colors.YELLOW}Pressione ENTER para continuar...{Colors.ENDC}")
        elif choice == '2':
            try:
                videos = client.get_channel_videos(channel.id)
                print(f"\n{Colors.BOLD}🎬 VÍDEOS DE {channel.name.upper()}{Colors.ENDC}\n")
                for i, v in enumerate(videos, 1):
                    print_video(v, i)
            except Exception as e:
                print(f"{Colors.RED}❌ Erro: {e}{Colors.ENDC}")
            input(f"\n{Colors.YELLOW}Pressione ENTER para continuar...{Colors.ENDC}")

def search_menu(client: NexaStreamClient):
    while True:
        print(f"\n{Colors.BOLD}🔍 BUSCAR CONTEÚDO{Colors.ENDC}\n")
        
        query = input(f"{Colors.CYAN}Digite sua busca: {Colors.ENDC}").strip()
        
        if not query:
            continue
        
        if query.lower() == '0':
            break
        
        try:
            videos = client.search_videos(query)
            print(f"\n{Colors.GREEN}Encontrados {len(videos)} resultados:{Colors.ENDC}\n")
            
            for i, v in enumerate(videos, 1):
                print_video(v, i)
        except Exception as e:
            print(f"{Colors.RED}❌ Erro na busca: {e}{Colors.ENDC}")
        
        print(f"\n{Colors.YELLOW}[0] Voltar | [ENTER] Nova busca{Colors.ENDC}")
        choice = input(f"{Colors.CYAN}>>> {Colors.ENDC}").strip()
        if choice == '0':
            break

def moderation_menu(client: NexaStreamClient):
    print(f"\n{Colors.BOLD}🛡️ MODERAÇÃO{Colors.ENDC}\n")
    
    videos = client.get_videos()
    
    print(f"{Colors.YELLOW}Selecione um vídeo para moderar:{Colors.ENDC}\n")
    
    for i, v in enumerate(videos, 1):
        status_color = Colors.GREEN if v.status == 'published' else Colors.YELLOW
        print(f"{Colors.YELLOW}[{i}]{Colors.ENDC} {v.title[:50]}")
        print(f"    Status: {status_color}{v.status}{Colors.ENDC} | Boost: {v.boostLevel}")
    
    print(f"\n{Colors.YELLOW}[0] Voltar{Colors.ENDC}")
    
    choice = input(f"\n{Colors.CYAN}>>> {Colors.ENDC}").strip()
    
    if choice.isdigit() and 1 <= int(choice) <= len(videos):
        video = videos[int(choice) - 1]
        
        print(f"\n{Colors.BOLD}AÇÕES PARA: {video.title[:40]}...{Colors.ENDC}\n")
        print(f"{Colors.GREEN}[1]{Colors.ENDC} 🚀 Aumentar Boost")
        print(f"{Colors.GREEN}[2]{Colors.ENDC} ⭐ Destacar")
        print(f"{Colors.GREEN}[3]{Colors.ENDC} 👁️ Ver detalhes")
        print(f"{Colors.RED}[4]{Colors.ENDC} 🚫 Ocultar vídeo")
        
        action = input(f"\n{Colors.CYAN}>>> {Colors.ENDC}").strip()
        
        try:
            if action == '1':
                updated = client.boost_video(video.id, min(video.boostLevel + 1, 5))
                print(f"{Colors.GREEN}✅ Boost atualizado!{Colors.ENDC}")
            elif action == '2':
                updated = client.feature_video(video.id)
                print(f"{Colors.GREEN}✅ Vídeo destacado!{Colors.ENDC}")
            elif action == '3':
                print_video(video)
            elif action == '4':
                updated = client.hide_video(video.id)
                print(f"{Colors.GREEN}✅ Vídeo oculto!{Colors.ENDC}")
        except Exception as e:
            print(f"{Colors.RED}❌ Erro: {e}{Colors.ENDC}")

def settings_menu(client: NexaStreamClient):
    while True:
        print(f"\n{Colors.BOLD}⚙️ CONFIGURAÇÕES{Colors.ENDC}\n")
        
        print(f"{Colors.GREEN}[1]{Colors.ENDC} 🔄 Limpar Cache")
        print(f"{Colors.GREEN}[2]{Colors.ENDC} ❤️ Verificar Status da API")
        print(f"{Colors.GREEN}[3]{Colors.ENDC} 📡 Ver Headers da API")
        print(f"{Colors.GREEN}[0]{Colors.ENDC} Voltar")
        
        choice = input(f"\n{Colors.CYAN}>>> {Colors.ENDC}").strip()
        
        if choice == '0':
            break
        elif choice == '1':
            client.clear_cache()
            print(f"{Colors.GREEN}✅ Cache limpo!{Colors.ENDC}")
        elif choice == '2':
            status = client.health_check()
            if status:
                print(f"{Colors.GREEN}✅ API Online{Colors.ENDC}")
            else:
                print(f"{Colors.RED}❌ API Offline{Colors.ENDC}")
        elif choice == '3':
            print(f"\n{Colors.CYAN}Headers da API:{Colors.ENDC}")
            print(f"Base URL: {client.BASE_URL}")
            print(f"Cache TTL: {client._cache_ttl}s")

def main():
    print_banner()
    
    # Inicializar cliente
    print(f"{Colors.CYAN}Conectando ao NexaStream...{Colors.ENDC}\n")
    
    try:
        client = NexaStreamClient()
        
        # Verificar conexão
        if not client.health_check():
            print(f"{Colors.RED}❌ Não foi possível conectar à API{Colors.ENDC}")
            sys.exit(1)
        
        print(f"{Colors.GREEN}✅ Conectado ao NexaStream!{Colors.ENDC}")
        
        while True:
            print_menu()
            choice = input(f"{Colors.CYAN}>>> Selecione uma opção: {Colors.ENDC}").strip()
            
            if choice == '0':
                print(f"\n{Colors.CYAN}Até logo! 👋{Colors.ENDC}\n")
                break
            elif choice == '1':
                statistics_menu(client)
            elif choice == '2':
                videos_menu(client)
            elif choice == '3':
                channels_menu(client)
            elif choice == '4':
                # Analytics detalhado do primeiro canal
                channels = client.get_channels()
                if channels:
                    analytics = client.get_channel_analytics(channels[0].id)
                    print(json.dumps(analytics, indent=2, default=str))
                input(f"\n{Colors.YELLOW}Pressione ENTER para continuar...{Colors.ENDC}")
            elif choice == '5':
                search_menu(client)
            elif choice == '6':
                moderation_menu(client)
            elif choice == '7':
                settings_menu(client)
            elif choice == '8':
                client.clear_cache()
                print(f"{Colors.GREEN}✅ Cache atualizado!{Colors.ENDC}")
            else:
                print(f"{Colors.RED}❌ Opção inválida{Colors.ENDC}")
    
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Operação cancelada.{Colors.ENDC}\n")
    except Exception as e:
        print(f"\n{Colors.RED}❌ Erro: {e}{Colors.ENDC}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
