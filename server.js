const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 🛡️ Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // Статичні файли з кореня
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 🕒 Антиспам
const recentSubmissions = new Map();
const SPAM_TIMEOUT = 10 * 1000;

// 📁 Шлях до файлу
const filePath = path.join(__dirname, 'messages.json');

// 📁 Утиліти
function readMessages() {
  if (!fs.existsSync(filePath)) return [];
  try {
    const content = fs.readFileSync(filePath, 'utf8').trim();
    return content ? JSON.parse(content) : [];
  } catch (err) {
    console.error('❌ Помилка читання messages.json:', err);
    return [];
  }
}

function saveMessageAsJSON(entry) {
  const data = readMessages();
  data.push(entry);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ Помилка запису в messages.json:', err);
  }
}

function isDuplicateMessage({ email, message }) {
  const messages = readMessages();
  return messages.some(entry =>
    entry.email === email && entry.message.trim() === message.trim()
  );
}

function basicAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const expected = 'Basic ' + Buffer.from(`${process.env.ADMIN_USER}:${process.env.ADMIN_PASS}`).toString('base64');
  if (auth !== expected) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Panel"');
    return res.status(401).send('Доступ заборонено');
  }
  next();
}

// 🌐 Головна сторінка
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 📩 API: контактна форма
app.post('/api/contact', async (req, res) => {
  const { name, phone, email, message } = req.body;

  if (!name || !phone || !email || !message) {
    return res.status(400).json({ success: false, error: 'Будь ласка, заповніть всі поля.' });
  }

  const now = Date.now();
  const lastSent = recentSubmissions.get(email);
  if (lastSent && now - lastSent < SPAM_TIMEOUT) {
    return res.status(429).json({ success: false, error: 'Зачекайте трохи перед повторним надсиланням.' });
  }

  if (isDuplicateMessage({ email, message })) {
    return res.status(409).json({ success: false, error: 'Це повідомлення вже було надіслано раніше.' });
  }

  recentSubmissions.set(email, now);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
  });

  const adminMail = {
    from: `"AgroFirma" <${process.env.MAIL_USER}>`,
    to: process.env.MAIL_USER,
    subject: 'Нове повідомлення з сайту',
    text: `Ім’я: ${name}\nТелефон: ${phone}\nEmail: ${email}\nПовідомлення:\n${message}`
  };

  const userReply = {
    from: `"AgroFirma" <${process.env.MAIL_USER}>`,
    to: email,
    subject: 'Дякуємо за звернення!',
    text: `Шановний(а) ${name},\n\nДякуємо за ваше повідомлення! Ми отримали його і зв’яжемося з вами найближчим часом.\n\nЗ повагою,\nКоманда AgroFirma`
  };

  try {
   /* await transporter.sendMail(adminMail);
    await transporter.sendMail(userReply);*/

    const logEntry = `[${new Date().toISOString()}]\nІм’я: ${name}\nТелефон: ${phone}\nEmail: ${email}\nПовідомлення: ${message}\n-------------------------------\n`;
    fs.appendFile(path.join(__dirname, 'messages.log'), logEntry, err => {
      if (err) console.error('❌ Помилка запису в .log:', err);
    });

    const jsonEntry = {
      timestamp: new Date().toISOString(),
      name,
      phone,
      email,
      message,
      id: Date.now().toString()
    };
    console.log(`[${new Date().toLocaleString()}] Нове повідомлення від ${name} (${email}): ${message}`);
    saveMessageAsJSON(jsonEntry);

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Помилка надсилання:', error);
    res.status(500).json({ success: false, error: error.message || 'Не вдалося надіслати повідомлення.' });
  }
});

// 🔐 Панель адміністратора
app.get('/admin', basicAuth, (req, res) => {
  const messages = readMessages();
  if (messages.length === 0) {
    return res.send('<h2>Немає жодного повідомлення.</h2>');
  }

  const fromDate = req.query.from && !isNaN(Date.parse(req.query.from)) ? new Date(req.query.from) : null;
  const toDate = req.query.to && !isNaN(Date.parse(req.query.to)) ? new Date(req.query.to) : null;

  const filteredData = messages.filter(entry => {
    const entryDate = new Date(entry.timestamp);
    return (!fromDate || entryDate >= fromDate) && (!toDate || entryDate <= toDate);
  });

  const totalMessages = filteredData.length;
  filteredData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const page = parseInt(req.query.page) || 1;
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(totalMessages / perPage));
  const startIndex = (page - 1) * perPage;
  const pageData = filteredData.slice(startIndex, startIndex + perPage);

  const queryParams = `from=${req.query.from || ''}&to=${req.query.to || ''}`;

  res.render('admin', {
    pageData,
    page,
    totalPages,
    queryParams,
    from: req.query.from || '',
    to: req.query.to || '',
    totalMessages
  });
});

// 🗑 Масове видалення повідомлень
app.post('/admin/delete-selected', basicAuth, (req, res) => {
  if (!fs.existsSync(filePath)) return res.status(404).send('Файл повідомлень не знайдено.');

  let selectedIds = req.body.selectedIds;
  if (!selectedIds) return res.redirect('/admin');

  if (!Array.isArray(selectedIds)) {
    selectedIds = [selectedIds];
  }

  const messages = readMessages();
  const updatedMessages = messages.filter(entry => !selectedIds.includes(entry.id?.toString()));

  try {
    fs.writeFileSync(filePath, JSON.stringify(updatedMessages, null, 2));
    res.redirect('/admin');
  } catch (err) {
    res.status(500).send('Помилка збереження оновлених повідомлень.');
  }
});

// ▶️ Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер працює на http://localhost:${PORT}`);
});


