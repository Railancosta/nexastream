import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 14);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nexastream.org' },
    update: {},
    create: {
      email: 'admin@nexastream.org',
      passwordHash: adminPassword,
      name: 'NexaStream Admin',
      username: 'nexastream',
      usdcAddress: '0xa453B71A216a8A6608e79247B162df47B2770899',
      emailVerified: true,
    }
  });

  // Create admin channel
  const adminChannel = await prisma.channel.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      name: 'NexaStream Official',
      slug: 'nexastream',
      description: 'Official NexaStream channel - The First Democratic Video Platform',
      category: 'Technology',
      isVerified: true,
      subscriberCount: 124800,
      videoCount: 312,
      totalEarnings: 42180.75,
    }
  });

  // Create sample channels
  const channels = [
    { name: 'Maria Crypto BR', slug: 'mariacryptobr', category: 'Crypto', subs: 124800, earnings: 42180.75 },
    { name: 'Sofia Artiste', slug: 'sofiaartiste', category: 'Music', subs: 67300, earnings: 19234.60 },
    { name: 'AlexTech', slug: 'alextech', category: 'Technology', subs: 48200, earnings: 8947.50 },
    { name: 'James Builds', slug: 'jamesbuilds', category: 'DIY', subs: 29400, earnings: 4821.20 },
  ];

  for (const c of channels) {
    const user = await prisma.user.upsert({
      where: { email: `${c.slug}@example.com` },
      update: {},
      create: {
        email: `${c.slug}@example.com`,
        passwordHash: adminPassword,
        name: c.name,
        username: c.slug,
        usdcAddress: '0xa453B71A216a8A6608e79247B162df47B2770899',
      }
    });
    await prisma.channel.upsert({
      where: { slug: c.slug },
      update: {},
      create: {
        userId: user.id,
        name: c.name,
        slug: c.slug,
        category: c.category,
        subscriberCount: c.subs,
        totalEarnings: c.earnings,
        videoCount: Math.floor(Math.random() * 100) + 50,
      }
    });
  }

  // Create sample videos
  const videos = [
    { title: 'Como Ganhar USDC Todo Dia no NexaStream', views: 298400, likes: 24100, earnings: 238.72, boost: 3 },
    { title: 'Bitcoin vs USDC: Qual é Melhor', views: 187200, likes: 15400, earnings: 149.76, boost: 2 },
    { title: 'Retirando Dinheiro do NexaStream via PIX', views: 142800, likes: 12890, earnings: 114.24, boost: 2 },
    { title: 'How NexaStream Pays Me $500/Month', views: 124500, likes: 8920, earnings: 98.74, boost: 2 },
    { title: 'Writing My First Song Live', views: 98700, likes: 14200, earnings: 78.96, boost: 1 },
  ];

  const allChannels = await prisma.channel.findMany();
  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    const channel = allChannels[i % allChannels.length];
    await prisma.video.upsert({
      where: { channelId_slug: { channelId: channel.id, slug: `video-${i}` } },
      update: {},
      create: {
        channelId: channel.id,
        title: v.title,
        slug: `video-${i}`,
        thumbnailUrl: `https://picsum.photos/seed/${i}/640/360`,
        videoUrl: 'https://example.com/video.mp4',
        duration: Math.floor(Math.random() * 600) + 60,
        category: channel.category,
        tags: ['nexastream', 'crypto', 'usdc'],
        status: 'PUBLISHED',
        publishedAt: new Date(),
        viewCount: BigInt(v.views),
        likeCount: v.likes,
        earningsUsdc: v.earnings,
        boostLevel: v.boost,
      }
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log(`📊 Admin: admin@nexastream.org / admin123`);
  console.log(`💰 USDC Address: 0xa453B71A216a8A6608e79247B162df47B2770899`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
