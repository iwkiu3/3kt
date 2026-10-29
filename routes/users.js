const express = require('express');
const router = express.Router();
const { prisma } = require('../config');
const Joi = require('joi');
const validate = require('../middleware/validate');

const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).required(),
  role: Joi.string().valid('USER', 'ADMIN').default('USER')
});

const updateUserSchema = Joi.object({
  email: Joi.string().email(),
  name: Joi.string().min(2),
  role: Joi.string().valid('USER', 'ADMIN')
});

router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.user.count()
    ]);

    res.json({
      success: true,
      data: users,
      meta: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { posts: { orderBy: { createdAt: 'desc' } } }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

router.post('/', validate(createUserSchema), async (req, res, next) => {
  try {
    const user = await prisma.user.create({ data: req.body });
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Email уже используется' });
    }
    next(error);
  }
});

router.patch('/:id', validate(updateUserSchema), async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await prisma.user.update({ where: { id: userId }, data: req.body });
    res.json({ success: true, data: user });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    await prisma.user.delete({ where: { id: userId } });
    res.json({ success: true, message: 'Пользователь удалён' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }
    next(error);
  }
});

module.exports = router;