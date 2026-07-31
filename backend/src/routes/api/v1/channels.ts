/**
 * Channel Routes
 * NexaStream API v1
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../utils/prisma';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { logger } from '../../utils/logger';

const router = Router();

// GET /api/v1/channels - List all channels
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;
    const category = req.query.category as string;
    const sortBy = req.query.sort as string || 'subscribers';

    let orderBy: any = {};
    switch (sortBy) {
      case 'subscribers':
        orderBy = { subscriberCount: 'desc' };
        break;
      case 'earnings':
        orderBy = { totalEarnings: 'desc' };
        break;
      case 'recent':
        orderBy = { createdAt: 'desc' };
        break;
      default:
        orderBy = { subscriberCount: 'desc' };
    }

    const where: any = { isActive: true };
    if (category) {
      where.category = category;
    }

    const [channels, total] = await Promise.all([
      prisma.channel.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          avatarUrl: true,
          bannerUrl: true,
          category: true,
          subscriberCount: true,
          videoCount: true,
          totalEarnings: true,
          isVerified: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            }
          }
        }
      }),
      prisma.channel.count({ where })
    ]);

    res.json({
      success: true,
      data: channels,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    });

  } catch (error) {
    logger.error('Get channels error:', error);
    res.status(500).json({ error: 'Failed to get channels' });
  }
});

// GET /api/v1/channels/:id - Get single channel
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const channel = await prisma.channel.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            bio: true,
          }
        },
        _count: {
          select: { videos: true }
        }
      }
    });

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    res.json({
      success: true,
      data: channel,
    });

  } catch (error) {
    logger.error('Get channel error:', error);
    res.status(500).json({ error: 'Failed to get channel' });
  }
});

// GET /api/v1/channels/:id/videos - Get channel videos
router.get('/:id/videos', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const channel = await prisma.channel.findUnique({ where: { id } });
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where: { channelId: id, status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.video.count({ where: { channelId: id, status: 'PUBLISHED' } })
    ]);

    res.json({
      success: true,
      data: videos,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });

  } catch (error) {
    logger.error('Get channel videos error:', error);
    res.status(500).json({ error: 'Failed to get channel videos' });
  }
});

// POST /api/v1/channels - Create channel
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { name, description, category, avatarUrl, bannerUrl } = req.body;

    // Check if user already has a channel
    const existing = await prisma.channel.findUnique({ where: { userId } });
    if (existing) {
      return res.status(400).json({ error: 'You already have a channel' });
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check slug uniqueness
    let finalSlug = slug;
    let counter = 1;
    while (await prisma.channel.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    const channel = await prisma.channel.create({
      data: {
        userId,
        name,
        slug: finalSlug,
        description,
        category: category || 'Entertainment',
        avatarUrl,
        bannerUrl,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
          }
        }
      }
    });

    // Create default feed preferences
    await prisma.feedPreference.create({
      data: {
        userId,
        preferredCategories: [category || 'Entertainment'],
        preferredLanguages: ['en'],
      }
    });

    logger.info(`Channel created: ${channel.id} for user ${userId}`);

    res.status(201).json({
      success: true,
      data: channel,
    });

  } catch (error) {
    logger.error('Create channel error:', error);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

// PUT /api/v1/channels/:id - Update channel
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const updates = req.body;

    const channel = await prisma.channel.findUnique({ where: { id } });
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    if (channel.userId !== userId) {
      return res.status(403).json({ error: 'You do not own this channel' });
    }

    const updated = await prisma.channel.update({
      where: { id },
      data: {
        name: updates.name,
        description: updates.description,
        avatarUrl: updates.avatarUrl,
        bannerUrl: updates.bannerUrl,
        category: updates.category,
        isMonetized: updates.isMonetized,
        seoTitle: updates.seoTitle,
        seoDescription: updates.seoDescription,
      }
    });

    res.json({
      success: true,
      data: updated,
    });

  } catch (error) {
    logger.error('Update channel error:', error);
    res.status(500).json({ error: 'Failed to update channel' });
  }
});

// POST /api/v1/channels/:id/subscribe - Subscribe to channel
router.post('/:id/subscribe', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const channel = await prisma.channel.findUnique({ where: { id } });
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    if (channel.userId === userId) {
      return res.status(400).json({ error: 'You cannot subscribe to your own channel' });
    }

    // Toggle subscription
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { followingIds: true }
    });

    const isSubscribed = user?.followingIds.includes(id);

    if (isSubscribed) {
      await prisma.user.update({
        where: { id: userId },
        data: { followingIds: { disconnect: id } }
      });
      await prisma.channel.update({
        where: { id },
        data: { subscriberCount: { decrement: 1 } }
      });
      return res.json({ success: true, subscribed: false });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { followingIds: { connect: id } }
      });
      await prisma.channel.update({
        where: { id },
        data: { subscriberCount: { increment: 1 } }
      });

      // Notify channel owner
      await prisma.notification.create({
        data: {
          userId: channel.userId,
          type: 'NEW_SUBSCRIBER',
          title: 'New Subscriber!',
          message: 'Someone subscribed to your channel',
        }
      });

      return res.json({ success: true, subscribed: true });
    }

  } catch (error) {
    logger.error('Subscribe error:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

export default router;
