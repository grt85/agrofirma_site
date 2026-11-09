const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const { localAgent } =
  require("./agents");

require("dotenv").config();

const app = express();

const PORT =
  process.env.PORT || 10000;

/* ==================================
   CORS
================================== */

app.use(
  cors({
    origin: [
      "https://agrofirma-site.onrender.com",
      "https://agrofirma.onrender.com",
      "http://localhost:3000"
    ]
  })
);

/* ==================================
   MIDDLEWARE
================================== */

app.use(bodyParser.json());

app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    )
  )
);

app.set("view engine", "ejs");

app.set(
  "views",
  path.join(
    __dirname,
    "views"
  )
);

/* ==================================
   FILES
================================== */

const filePath =
  path.join(
    __dirname,
    "messages.json"
  );

const logPath =
  path.join(
    __dirname,
    "messages.log"
  );

/* ==================================
   ANTISPAM
================================== */

const recentSubmissions =
  new Map();

const SPAM_TIMEOUT =
  60 * 1000;

/* ==================================
   MAILER
================================== */

const transporter =
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });

/* ==================================
   HELPERS
================================== */

function readMessages() {

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {

    const content =
      fs
        .readFileSync(
          filePath,
          "utf8"
        )
        .trim();

    return content
      ? JSON.parse(content)
      : [];

  } catch (err) {

    console.error(
      "❌ Помилка читання messages.json:",
      err
    );

    return [];

  }

}

function saveMessageAsJSON(
  entry
) {

  const messages =
    readMessages();

  messages.push(entry);

  try {

    fs.writeFileSync(
      filePath,
      JSON.stringify(
        messages,
        null,
        2
      )
    );

  } catch (err) {

    console.error(
      "❌ Помилка запису messages.json:",
      err
    );

  }

}

function isDuplicateMessage({
  email,
  message
}) {

  const messages =
    readMessages();

  return messages.some(
    item =>
      item.email === email &&
      item.message.trim() ===
        message.trim()
  );

}

/* ==================================
   BASIC AUTH
================================== */

function basicAuth(
  req,
  res,
  next
) {

  const auth =
    req.headers.authorization || "";

  const expected =
    "Basic " +
    Buffer.from(
      `${process.env.ADMIN_USER}:${process.env.ADMIN_PASS}`
    ).toString("base64");

  if (auth !== expected) {

    res.set(
      "WWW-Authenticate",
      'Basic realm="Admin Panel"'
    );

    return res
      .status(401)
      .send("Доступ заборонено");

  }

  next();

}

/* ==================================
   CONTACT FORM
================================== */

app.post(
  "/api/contact",
  async (req, res) => {

    const {
      name,
      phone,
      email,
      message
    } = req.body;

    if (
      !name ||
      !phone ||
      !email ||
      !message
    ) {

      return res.status(400).json({
        success: false,
        error:
          "Будь ласка, заповніть всі поля."
      });

    }

    if (message.length > 1000) {

      return res.status(400).json({
        success: false,
        error:
          "Повідомлення занадто довге."
      });

    }

    const emailKey =
      email
        .trim()
        .toLowerCase();

    const now =
      Date.now();

    const lastSent =
      recentSubmissions.get(
        emailKey
      );

    if (
      lastSent &&
      now - lastSent <
        SPAM_TIMEOUT
    ) {

      return res.status(429).json({
        success: false,
        error:
          "Зачекайте трохи перед повторним надсиланням."
      });

    }

    if (
      isDuplicateMessage({
        email: emailKey,
        message
      })
    ) {

      return res.status(409).json({
        success: false,
        error:
          "Це повідомлення вже надсилалось."
      });

    }

    recentSubmissions.set(
      emailKey,
      now
    );

    try {

      /*
      await transporter.sendMail(adminMail);
      await transporter.sendMail(userReply);
      */

      const logEntry =
`[${new Date().toISOString()}]
Ім’я: ${name}
Телефон: ${phone}
Email: ${email}
Повідомлення: ${message}
---------------------------
`;

      fs.appendFile(
        logPath,
        logEntry,
        err => {
          if (err) {
            console.error(err);
          }
        }
      );

      const jsonEntry = {
        id: Date.now().toString(),
        timestamp:
          new Date().toISOString(),
        name,
        phone,
        email,
        message
      };

      saveMessageAsJSON(
        jsonEntry
      );

      console.log(
        `[${new Date().toLocaleString()}] Нове повідомлення від ${name} (${email})`
      );

      return res.json({
        success: true
      });

    } catch (error) {

      console.error(
        "❌ Помилка надсилання:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Не вдалося надіслати повідомлення."
      });

    }

  }
);

/* ==================================
   CHAT AGENT
================================== */

app.post(
  "/fallback-agent",
  async (req, res) => {

    const {
      question
    } = req.body;

    try {

      const result =
        await localAgent(
          question
        );

      res.json(result);

    } catch (err) {

      console.error(
        "❌ Помилка агента:",
        err
      );

      res.status(500).json({
        answer: {
          error:
            err.message
        }
      });

    }

  }
);

/* ==================================
   ADMIN PANEL
================================== */

app.get(
  "/admin",
  basicAuth,
  (req, res) => {

    const messages =
      readMessages();

    const fromDate =
      req.query.from
        ? new Date(
            req.query.from
          )
        : null;

    const toDate =
      req.query.to
        ? new Date(
            req.query.to
          )
        : null;

    const filtered =
      messages.filter(
        item => {

          const date =
            new Date(
              item.timestamp
            );

          return (
            (!fromDate ||
              date >=
                fromDate) &&
            (!toDate ||
              date <=
                toDate)
          );

        }
      );

    filtered.sort(
      (a, b) =>
        new Date(
          b.timestamp
        ) -
        new Date(
          a.timestamp
        )
    );

    const page =
      parseInt(
        req.query.page
      ) || 1;

    const perPage = 10;

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          filtered.length /
            perPage
        )
      );

    const start =
      (page - 1) *
      perPage;

    const pageData =
      filtered.slice(
        start,
        start + perPage
      );

    const queryParams =
      `from=${req.query.from || ""}&to=${req.query.to || ""}`;

    res.render(
      "admin",
      {
        pageData,
        page,
        totalPages,
        queryParams,
        totalMessages:
          filtered.length,
        from:
          req.query.from || "",
        to:
          req.query.to || ""
      }
    );

  }
);

/* ==================================
   DELETE
================================== */

app.post(
  "/admin/delete-selected",
  basicAuth,
  (req, res) => {

    let selectedIds =
      req.body.selectedIds;

    if (!selectedIds) {
      return res.redirect(
        "/admin"
      );
    }

    if (
      !Array.isArray(
        selectedIds
      )
    ) {

      selectedIds = [
        selectedIds
      ];

    }

    const messages =
      readMessages();

    const updated =
      messages.filter(
        item =>
          !selectedIds.includes(
            item.id?.toString()
          )
      );

    fs.writeFileSync(
      filePath,
      JSON.stringify(
        updated,
        null,
        2
      )
    );

    res.redirect(
      "/admin"
    );

  }
);

/* ==================================
   SERVER
================================== */

app.listen(
  PORT,
  () => {

    console.log(
      `🚀 Сервер працює на порту ${PORT}`
    );

  }
);
