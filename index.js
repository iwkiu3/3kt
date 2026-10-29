const express = require('express');
const usersRouter = require('./routes/users');
const postsRouter = require('./routes/posts');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/users', usersRouter);
app.use('/api/posts', postsRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
