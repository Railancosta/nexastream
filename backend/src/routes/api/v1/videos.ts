/**
 * Video Routes
 * NexaStream API v1
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validator';
import { logger } from '../../utils/logger';
import { config } from '../../config';

const router = Router();

// GET /api/v1/videos - List all videos
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;
    const category = req.query.category as string;
    const sortBy = req.query.sort as string || 'trending';

    let orderBy: any = {};
    switch (sortBy) {
      case 'views':
        orderBy = { viewCount: 'desc' };
        break;
      case 'recent':
        orderBy = { publishedAt: 'desc' };
        break;
      case 'earnings':
        orderBy = { earningsUsdc: 'desc' };
        break;
      default:
        orderBy = { viewCount: 'desc' };
    }

    const where: any = {
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
    };

    if (category) {
      where.category = category;
    }

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          channel: {
            select: {
              id: true,
              name: true,
              slug: true,
              avatarUrl: true,
              subscriberCount: true,
            }
          }
        }
      }),
      prisma.video.count({ where })
    ]);

    res.json({
      success: true,
      data: videos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    });

  } catch (error) {
    logger.error('Get videos error:', error);
    res.status(500).json({ error: 'Failed to get videos' });
  }
});

// GET /api/v1/videos/trending - Trending videos
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const videos = await prisma.video.findMany({
      where: {
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      },
      orderBy: [
        { boostLevel: 'desc' },
        { viewCount: 'desc' },
        { engagementRate: 'desc' },
      ],
      take: 20,
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            slug: true,
            avatarUrl: true,
          }
        }
      }
    });

    res.json({
      success: true,
      data: videos,
    });

  } catch (error) {
    logger.error('Get trending error:', error);
    res.status(500).json({ error: 'Failed to get trending videos' });
  }
});

// GET /api/v1/videos/:id - Get single video
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const video = await prisma.video.findUnique({
      where: { id },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            slug: true,
            avatarUrl: true,
            subscriberCount: true,
            isVerified: true,
          }
        },
        likes: true,
      }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (video.visibility === 'PRIVATE' && video.channel.userId !== (req as any).user?.id) {
      return res.status(403).json({ error: 'This video is private' });
    }

    // Increment view count
    await prisma.video.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    });

    res.json({
      success: true,
      data: video,
    });

  } catch (error) {
    logger.error('Get video error:', error);
    res.status(500).json({ error: 'Failed to get video' });
  }
});

// POST /api/v1/videos - Create video (authenticated)
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { title, description, thumbnailUrl, videoUrl, duration, category, tags, language } = req.body;

    const channel = await prisma.channel.findUnique({
      where: { userId }
    });

    if (!channel) {
      return res.status(400).json({ error: 'You need to create a channel first' });
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Date.now().toString(36);

    const video = await prisma.video.create({
      data: {
        channelId: channel.id,
        title,
        description,
        thumbnailUrl,
        videoUrl,
        duration: duration || 0,
        category: category || 'Entertainment',
        tags: tags || [],
        language: language || 'en',
        slug,
        status: 'PROCESSING',
      },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        }
      }
    });

    // Update channel video count
    await prisma.channel.update({
      where: { id: channel.id },
      data: { videoCount: { increment: 1 } }
    });

    logger.info(`Video created: ${video.id} by user ${userId}`);

    res.status(201).json({
      success: true,
      data: video,
    });

  } catch (error) {
    logger.error('Create video error:', error);
    res.status(500).json({ error: 'Failed to create video' });
  }
});

// PUT /api/v1/videos/:id - Update video
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const updates = req.body;

    const video = await prisma.video.findUnique({
      where: { id },
      include: { channel: true }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (video.channel.userId !== userId) {
      return res.status(403).json({ error: 'You do not own this video' });
    }

    const updated = await prisma.video.update({
      where: { id },
      data: {
        title: updates.title,
        description: updates.description,
        category: updates.category,
        tags: updates.tags,
        visibility: updates.visibility,
        isMonetized: updates.isMonetized,
      }
    });

    res.json({
      success: true,
      data: updated,
    });

  } catch (error) {
    logger.error('Update video error:', error);
    res.status(500).json({ error: 'Failed to update video' });
  }
});

// DELETE /api/v1/videos/:id - Delete video
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const video = await prisma.video.findUnique({
      where: { id },
      include: { channel: true }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (video.channel.userId !== userId) {
      return res.status(403).json({ error: 'You do not own this video' });
    }

    await prisma.video.delete({ where: { id } });

    // Update channel video count
    await prisma.channel.update({
      where: { id: video.channelId },
      data: { videoCount: { decrement: 1 } }
    });

    res.json({
      success: true,
      message: 'Video deleted successfully',
    });

  } catch (error) {
    logger.error('Delete video error:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

// POST /api/v1/videos/:id/like - Like video
router.post('/:id/like', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { type } = req.body; // 'LIKE' or 'DISLIKE'

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const existingLike = await prisma.like.findUnique({
      where: { userId_videoId: { userId, videoId: id } }
    });

    if (existingLike) {
      if (existingLike.type === type) {
        // Remove like
        await prisma.like.delete({ where: { id: existingLike.id } });
        await prisma.video.update({
          where: { id },
          data: { likeCount: { decrement: 1 } }
        });
        return res.json({ success: true, action: 'removed' });
      } else {
        // Change like type
        await prisma.like.update({
          where: { id: existingLike.id },
          data: { type }
        });
        return res.json({ success: true, action: 'updated' });
      }
    }

    // Create new like
    await prisma.like.create({
      data: { userId, videoId: id, type: type || 'LIKE' }
    });

    await prisma.video.update({
      where: { id },
      data: { likeCount: { increment: 1 } }
    });

    res.json({ success: true, action: 'liked' });

  } catch (error) {
    logger.error('Like video error:', error);
    res.status(500).json({ error: 'Failed to like video' });
  }
});

// POST /api/v1/videos/:id/boost - Boost video
router.post('/:id/boost', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { level } = req.body;

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const boostCost = config.boosting.boostCostPerLevel[level] || 0;

    // Create boost record
    const boost = await prisma.boost.create({
      data: {
        videoId: id,
        userId,
        level,
        costUsdc: boostCost,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    });

    // Update video boost level
    await prisma.video.update({
      where: { id },
      data: {
        boostLevel: Math.max(video.boostLevel, level),
        boostedCount: { increment: 1 }
      }
    });

    res.json({
      success: true,
      data: boost,
      message: `Video boosted to level ${level}`,
    });

  } catch (error) {
    logger.error('Boost video error:', error);
    res.status(500).json({ error: 'Failed to boost video' });
  }
});

export default router;
