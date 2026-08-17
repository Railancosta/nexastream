const WebTorrent = require('webtorrent')
const client = new WebTorrent()

// Seed de vídeos para rede P2P
client.seed('/caminho/para/video.mp4', {
  name: 'nexastream-video',
  announce: [
    'wss://tracker.openwebtorrent.com',
    'wss://tracker.btorrent.xyz'
  ]
}, torrent => {
  console.log('✅ Vídeo seedado na rede P2P!')
  console.log('Magnet URI:', torrent.magnetURI)
  console.log('Info hash:', torrent.infoHash)
})
