const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;

const JWT_SECRET = 'a7f3e8d2c1b9a4f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1';
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/GuessGame')
  .then(() => console.log(' Підключено до MongoDB (GuessGame)'))
    .catch(err => console.error(' Помилка:', err));
  
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  total_games: { type: Number, default: 0 },
  total_wins: { type: Number, default: 0 },
  best_time_4digit: { type: Number, default: null },
  best_attempts_4digit: { type: Number, default: null },
  best_time_5digit: { type: Number, default: null },
  best_attempts_5digit: { type: Number, default: null },
  best_time_6digit: { type: Number, default: null },
  best_attempts_6digit: { type: Number, default: null }
});

const gameSessionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  digits_count: { type: Number, required: true },
  max_attempts: { type: Number, required: true },
  is_win: { type: Boolean, required: true },
  attempts_used: { type: Number, required: true },
  time_seconds: { type: Number, required: true },
  secret_number: { type: String },
  attempts: { type: Array, default: [] },
  played_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const GameSession = mongoose.model('GameSession', gameSessionSchema);

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Немає токена' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Невірний токен' });
  }
};

app.post("/api/auth/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Користувач з таким email вже існує' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hashedPassword });
        await user.save();

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            message: 'Користувач створений успішно',
            token,  
            user: { 
                _id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log('>>> Отримано:', JSON.stringify(req.body)); // 
      console.log('>>> email:', email, '| password:', password);
      const user = await User.findOne({ email });
      console.log('>>> Юзер знайдений:', user ? user.email : 'НЕ ЗНАЙДЕНО');
        if (!user) {
            return res.status(400).json({ error: 'Невірний email або пароль' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Невірний email або пароль' });
        }
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
        message: 'Вхід успішний',
        token,
        user: {
            _id: user._id,
            username: user.username,
            email: user.email
      }
    });
    } catch (error) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

app.post('/api/game/save', authMiddleware, async (req, res) => {
  try {
    const {
      digits_count,
      max_attempts,
      is_win,
      attempts_used,
      time_seconds,
      secret_number,
      attempts
    } = req.body;
    
    // Зберігаємо гру
    const gameSession = new GameSession({
      user_id: req.userId,
      digits_count,
      max_attempts,
      is_win,
      attempts_used,
      time_seconds,
      secret_number,
      attempts
    });
    
    await gameSession.save();
    
    // Оновлюємо статистику користувача
    const user = await User.findById(req.userId);
    const newTotalGames = (user.total_games || 0) + 1;
    const newTotalWins = (user.total_wins || 0) + (is_win ? 1 : 0);
    
    // Оновлюємо найкращі результати для цієї складності
    const fieldTime = `best_time_${digits_count}digit`;
    const fieldAttempts = `best_attempts_${digits_count}digit`;
    
    const updateData = {
      total_games: newTotalGames,
      total_wins: newTotalWins
    };
    
    if (is_win) {
      if (!user[fieldTime] || time_seconds < user[fieldTime]) {
        updateData[fieldTime] = time_seconds;
      }
      if (!user[fieldAttempts] || attempts_used < user[fieldAttempts]) {
        updateData[fieldAttempts] = attempts_used;
      }
    }
    
    await User.findByIdAndUpdate(req.userId, updateData);
    
    res.json({ message: 'Гру збережено!' });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//ОТРИМАТИ НАЙКРАЩИЙ РЕЗУЛЬТАТ ГРАВЦЯ
app.get('/api/game/best', authMiddleware, async (req, res) => {
  try {
    const { digits = 4 } = req.query;
    
    const bestRecord = await GameSession.findOne({
      user_id: req.userId,
      digits_count: parseInt(digits),
      is_win: true
    }).sort({ attempts_used: 1, time_seconds: 1 });
    
    if (!bestRecord) {
      return res.json({ hasRecord: false });
    }
    
    res.json({
      hasRecord: true,
      attempts_used: bestRecord.attempts_used,
      time_seconds: bestRecord.time_seconds
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ОТРИМАТИ ТОП-10 ТАБЛИЦЮ ЛІДЕРІВ
app.get('/api/game/leaderboard', async (req, res) => {
  try {
    const { digits = 4 } = req.query;
    console.log('>>> digits:', digits, '| parseInt:', parseInt(digits));

    const leaderboard = await GameSession.aggregate([
      { $match: { digits_count: parseInt(digits), is_win: true } },
      {
        $group: {
          _id: "$user_id",
          best_attempts: { $min: "$attempts_used" },
          best_time: { $min: "$time_seconds" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          username: "$user.username",
          best_attempts: 1,
          best_time: 1
        }
      },
      { $sort: { best_attempts: 1, best_time: 1 } },
      { $limit: 10 }
    ]);

    console.log('>>> Leaderboard результат:', JSON.stringify(leaderboard));
    res.json(leaderboard);

  } catch (error) {
    console.error('>>> Помилка:', error);
    res.status(500).json({ error: error.message });
  }
});
app.listen(PORT, () => {
  console.log(`Сервер працює на http://localhost:${PORT}`);
});