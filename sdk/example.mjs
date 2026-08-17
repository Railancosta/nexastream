import { NexaStream } from './nexastream.mjs';
const ns = new NexaStream();
const vids = await ns.videos();
console.log('videos via SDK:', vids.videos.length);
console.log('chain valid:', (await ns.verifyChain()).valid);
const w = await ns.wallet();
console.log('carteira nova:', w.address.slice(0, 12) + '...');
if (vids.videos[0]) {
  const c = await ns.comment(vids.videos[0].id, 'sdk-bot', 'comentario publicado via SDK');
  console.log('comment ok:', !!c.id);
}
console.log('SDK OK');
