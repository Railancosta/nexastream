const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

async function start() {
  const ipfs = await IPFS.create()
  const orbitdb = await OrbitDB.createInstance(ipfs)
  
  // Criar banco de dados de vídeos
  const videos = await orbitdb.log('nexastream-videos')
  await videos.add({ title: 'Primeiro Vídeo', uploader: 'user1' })
  
  console.log('✅ OrbitDB iniciado!')
  console.log('Endereço:', videos.address.toString())
}

start()
