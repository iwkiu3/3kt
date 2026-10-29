const express = require('express');
const router = express.Router();
const { prisma } = require('../config');
const Joi = require('joi');
const validate = require('../middleware/validate');

const createPostSchema = Joi.object({
  title: Joi.string().min(1).required(),
  content: Joi.string().allow('', null),
  published: Joi.boolean().default(false),
  authorId: Joi.number().integer().required(),
  tags: Joi.array().items(Joi.string()).default([])
});

const updatePostSchema = Joi.object({
  title: Joi.string().min(1),
  content: Joi.string().allow('', null),
  published: Joi.boolean(),
  tags: Joi.array().items(Joi.string())
});

router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const where = {};

    if (req.query.search) {
      where.title = { contains: req.query.search, mode: 'insensitive' };
    }

    if (req.query.published !== undefined) {
      where.published = req.query.published === 'true';
    }

    if (req.query.authorId) {
      where.authorId = parseInt(req.query.authorId);
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: limit,
        include: { author: true, tags: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.post.count({ where })
    ]);

    res.json({
      success: true,
      data: posts,
      meta: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id);
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { author: true, tags: true }
    });

    if (!post) {
      return res.status(404).json({ success: false, message: 'Пост не найден' });
    }

    res.json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
});

router.post('/', validate(createPostSchema), async (req, res, next) => {
  try {
    const { title, content, published, authorId, tags } = req.body;

    const post = await prisma.post.create({
      data: {
        title,
        content,
        published,
        authorId,
        tags: {
          connectOrCreate: tags.map(tag => ({
            where: { name: tag },
            create: { name: tag }
          }))
        }
      },
      include: { author: true, tags: true }
    });

    res.status(201).json({ success: true, data: post });
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(400).json({ success: false, message: 'Автор не найден' });
    }
    next(error);
  }
});

router.patch('/:id', validate(updatePostSchema), async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id);
    const { title, content, published, tags } = req.body;

    const updateData = { title, content, published };

    if (tags) {
      updateData.tags = {
        set: [],
        connectOrCreate: tags.map(tag => ({
          where: { name: tag },
          create: { name: tag }
        }))
      };
    }

    const post = await prisma.post.update({
      where: { id: postId },
      data: updateData,
      include: { author: true, tags: true }
    });

    res.json({ success: true, data: post });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Пост не найден' });
    }
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id);
    await prisma.post.delete({ where: { id: postId } });
    res.json({ success: true, message: 'Пост удалён' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Пост не найден' });
    }
    next(error);
  }
});

module.exports = router;