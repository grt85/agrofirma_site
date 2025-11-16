// ⏳ Прелоадер
window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';
});

// 🧾 Повідомлення
function showMessage(text, isError) {
  const formMessage = document.getElementById('formMessage');
  if (!formMessage) return;

  formMessage.textContent = text;
  formMessage.className = `form-message ${isError ? 'error' : 'success'} show`;
  formMessage.style.display = 'block';

  setTimeout(() => {
    formMessage.classList.remove('show');
    setTimeout(() => {
      formMessage.style.display = 'none';
    }, 400);
  }, 5000);
}

// 🧭 Swiper ініціалізація
function initSwiper(selector, config) {
  const el = document.querySelector(selector);
  if (el && window.Swiper) new Swiper(el, config);
}

// 🔄 DOM готовий
document.addEventListener('DOMContentLoaded', () => {
  // 🔸 AOS
  if (window.AOS) {
    AOS.init({
      duration: 1200,
      easing: 'ease-in-out',
      once: true
    });
  }

  // 🔸 Пасивний touchstart
  document.addEventListener('touchstart', () => {}, { passive: true });

  // 🔸 Меню-бургер
  const burger = document.getElementById('burger');
  const navMenu = document.getElementById('nav-menu');
  burger?.addEventListener('click', () => {
    navMenu?.classList.toggle('active');
  });

  // 🔸 Маска телефону
  if (window.Inputmask) {
    Inputmask({
      mask: "+38 (999) 999-99-99",
      showMaskOnHover: false,
      showMaskOnFocus: true,
      clearIncomplete: true
    }).mask("#phone");
  }

  // 🔸 Обробка форми
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();

      const values = {
        name: form.name?.value.trim(),
        phone: form.phone?.value.trim(),
        email: form.email?.value.trim(),
        message: form.message?.value.trim()
      };

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\+38\s\(\d{3}\)\s\d{3}-\d{2}-\d{2}$/;

      if (Object.values(values).some(v => !v)) {
        return showMessage('Будь ласка, заповніть всі поля.', true);
      }
      if (!emailRegex.test(values.email)) {
        return showMessage('Введіть коректний email.', true);
      }
      if (!phoneRegex.test(values.phone)) {
        return showMessage('Введіть коректний номер телефону.', true);
      }

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })
        .then(res => res.json())
        .then(response => {
          if (response.success) {
            showMessage('✅ Повідомлення надіслано!', false);
            form.reset();
          } else {
            showMessage('❌ Помилка: ' + response.error, true);
          }
        })
        .catch(() => {
          showMessage('❌ Сервер недоступний.', true);
        });
    });
  }

  // 🔸 Flip-картки
  const isMobile = () => window.innerWidth <= 768;
  const cards = document.querySelectorAll('.flip-card');

  cards.forEach(card => {
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

  document.addEventListener('click', e => {
    if (!isMobile()) return;
    cards.forEach(card => {
      if (card.classList.contains('flipped') && !card.contains(e.target)) {
        card.classList.remove('flipped');
      }
    });
  });

  // 🔸 Swiper ініціалізація
  initSwiper('.team-swiper', {
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

  initSwiper('.footer-ad-slider', {
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
});