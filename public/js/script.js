
if (typeof AOS !== 'undefined') {
  AOS.init({
    duration: 1200,
    easing: 'ease-in-out',
    once: true
  });
}

// ⏳ Приховати прелоадер
window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';
});

// 🍔 Меню-бургер
const burger = document.getElementById('burger');
const navMenu = document.getElementById('nav-menu');
burger?.addEventListener('click', () => {
  navMenu?.classList.toggle('active');
});

// 🧭 Swiper: Команда
const teamSwiper = document.querySelector('.team-swiper');
if (teamSwiper) {
  new Swiper(teamSwiper, {
    slidesPerView: 1,
    spaceBetween: 20,
    loop: true,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev'
    },
    pagination: {
      el: '.swiper-pagination',
      clickable: true
    },
    breakpoints: {
      768: { slidesPerView: 2 },
      1024: { slidesPerView: 3 }
    }
  });
}

// 📢 Swiper: Рекламний слайдер
const adSlider = document.querySelector('.footer-ad-slider');
if (adSlider) {
  new Swiper(adSlider, {
    loop: true,
    autoplay: {
      delay: 4000,
      disableOnInteraction: false
    },
    speed: 800,
    pagination: {
      el: '.swiper-pagination',
      clickable: true
    },
    slidesPerView: 1,
    spaceBetween: 20
  });
}

// 📱 Перевірка мобільного екрану
const isMobile = () => window.innerWidth <= 768;

// 🔁 Переворот карток
document.querySelectorAll('.flip-card').forEach(card => {
  const flipBtn = card.querySelector('.flip-btn');
  const backBtn = card.querySelector('.back-btn');

  flipBtn?.addEventListener('click', e => {
    e.stopPropagation();
    if (isMobile()) card.classList.add('flipped');
  });

  backBtn?.addEventListener('click', e => {
    e.stopPropagation();
    if (isMobile()) card.classList.remove('flipped');
  });
});

// 🔙 Закриття картки при кліку поза нею
document.addEventListener('click', e => {
  if (!isMobile()) return;
  document.querySelectorAll('.flip-card.flipped').forEach(card => {
    if (!card.contains(e.target)) {
      card.classList.remove('flipped');
    }
  });
});

// 📞 Маска для телефону
if (typeof Inputmask !== 'undefined') {
  Inputmask({
    mask: "+38 (999) 999-99-99",
    showMaskOnHover: false,
    showMaskOnFocus: true,
    clearIncomplete: true
  }).mask("#phone");
}

// 📩 Обробка форми
const contactForm = document.getElementById('contactForm');
contactForm?.addEventListener('submit', function (e) {
  e.preventDefault();

  const name = this.name?.value.trim();
  const phone = this.phone?.value.trim();
  const email = this.email?.value.trim();
  const message = this.message?.value.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+38\s\(\d{3}\)\s\d{3}-\d{2}-\d{2}$/;

  if (!name || !phone || !email || !message) {
    return showMessage('Будь ласка, заповніть всі поля.', true);
  }

  if (!emailRegex.test(email)) {
    return showMessage('Введіть коректний email.', true);
  }

  if (!phoneRegex.test(phone)) {
    return showMessage('Введіть коректний номер телефону.', true);
  }

  fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, email, message })
  })
    .then(res => res.json())
    .then(response => {
      if (response.success) {
        showMessage('✅ Повідомлення надіслано!', false);
        this.reset();
      } else {
        showMessage('❌ Помилка: ' + response.error, true);
      }
    })
    .catch(() => {
      showMessage('❌ Сервер недоступний.', true);
    });
});

// 🧾 Повідомлення
function showMessage(text, isError) {
  const formMessage = document.getElementById('formMessage');
  if (!formMessage) return;

  formMessage.textContent = text;
  formMessage.classList.remove('error', 'success', 'show');
  formMessage.classList.add(isError ? 'error' : 'success', 'show');
  formMessage.style.display = 'block';

  setTimeout(() => {
    formMessage.classList.remove('show');
    setTimeout(() => {
      formMessage.style.display = 'none';
    }, 400);
  }, 5000);
}












import { sendMessage } from "./chatAgent.js";

document.getElementById("chat-send").addEventListener("click", () => {
  const input = document.getElementById("chat-input");
  sendMessage(input.value);
  input.value = "";
});

document.getElementById("chat-input").addEventListener("keypress", e => {
  if (e.key === "Enter") {
    sendMessage(e.target.value);
    e.target.value = "";
  }
});


   