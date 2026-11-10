const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const { localAgent } = require("../agents");

require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 10000;

/* ===================================
   MIDDLEWARE
=================================== */

app.use(cors());

app.use(bodyParser.json());

app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

/* ===================================
   STATIC FILES
=================================== */

app.use(express.static(__dirname));

/* ===================================
   VIEWS
=================================== */

app.set("view engine", "ejs");

app.set(
  "views",
  path.join(__dirname, "../views")
);

/* ===================================
   ROOT
=================================== */

app.get("/", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "index.html"
    )
  );
});

/* ===================================
   FILES
=================================== */

const filePath = path.join(
  __dirname,
  "../messages.json"
);

const logPath = path.join(
  __dirname,
  "../messages.log"
);

/* ===================================
   ANTISPAM
=================================== */

const recentSubmissions =
  new Map();

const SPAM_TIMEOUT =
  60 * 1000;

/* ===================================
   MAIL TRANSPORT
=================================== */

const transporter =
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS
    }
  });

/* ===================================
   HELPERS
=================================== */

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

  } catch (error) {

    console.error(
      "Помилка читання messages.json:",
      error
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

  fs.writeFileSync(
    filePath,
    JSON.stringify(
      messages,
      null,
      2
    )
  );

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

/* ===================================
   BASIC AUTH
=================================== */

function basicAuth(
  req,
  res,
  next
) {

  const auth =
    req.headers.authorization ||
    "";

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
      .send(
        "Доступ заборонено"
      );

  }

  next();

}

/* ===================================
   CONTACT FORM
=================================== */

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

    const key =
      email
        .trim()
        .toLowerCase();

    const now =
      Date.now();

    const lastSent =
      recentSubmissions.get(key);

    if (
      lastSent &&
      now - lastSent <
        SPAM_TIMEOUT
    ) {

      return res.status(429).json({
        success: false,
        error:
          "Зачекайте перед повторним надсиланням."
      });

    }

    if (
      isDuplicateMessage({
        email: key,
        message
      })
    ) {

      return res.status(409).json({
        success: false,
        error:
          "Таке повідомлення вже існує."
      });

    }

    recentSubmissions.set(
      key,
      now
    );

    try {

      /*
      await transporter.sendMail(adminMail);
      await transporter.sendMail(userReply);
      */

      const logEntry =
`[${new Date().toISOString()}]
Ім'я: ${name}
Телефон: ${phone}
Email: ${email}
Повідомлення: ${message}
-----------------------------------
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

      saveMessageAsJSON({
        id:
          Date.now().toString(),
        timestamp:
          new Date().toISOString(),
        name,
        phone,
        email,
        message
      });

      res.json({
        success: true
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        error:
          "Помилка сервера"
      });

    }

  }
);

/* ===================================
   CHAT AGENT
=================================== */

app.post(
  "/fallback-agent",
  async (req, res) => {

    try {

      const result =
        await localAgent(
          req.body.question
        );

      res.json(result);

    } catch (error) {

      console.error(
        "❌ Помилка агента:",
        error
      );

      res.status(500).json({
        answer: {
          error:
            error.message
        }
      });

    }

  }
);

/* ===================================
   ADMIN PANEL
=================================== */

app.get(
  "/admin",
  basicAuth,
  (req, res) => {

    const messages =
      readMessages();

    res.render(
      "admin",
      {
        pageData:
          messages,
        page: 1,
        totalPages: 1,
        queryParams: "",
        from: "",
        to: "",
        totalMessages:
          messages.length
      }
    );

  }
);

/* ===================================
   DELETE SELECTED
=================================== */

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

    const updated =
      readMessages().filter(
        item =>
          !selectedIds.includes(
            item.id
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

    res.redirect("/admin");

  }
);

/* ===================================
   START SERVER
=================================== */

app.listen(
  PORT,
  () => {

    console.log(
      `🚀 Сервер працює на порту ${PORT}`
    );

  }
);
