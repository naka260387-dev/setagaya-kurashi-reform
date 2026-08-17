(() => {
  'use strict';

  /* ===== ハンバーガーメニュー ===== */
  const menuToggle = document.querySelector('.menu-toggle');
  const gnav = document.querySelector('.gnav');
  const header = document.querySelector('.site-header');

  if (menuToggle && gnav) {
    menuToggle.addEventListener('click', () => {
      const isOpen = gnav.classList.toggle('is-open');
      menuToggle.classList.toggle('is-open', isOpen);
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      document.body.classList.toggle('nav-open', isOpen);
    });

    gnav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        gnav.classList.remove('is-open');
        menuToggle.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('nav-open');
      });
    });
  }

  /* ヘッダーのスクロール影 */
  if (header) {
    const onScroll = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ===== スクロールでフェードインアップ ===== */
  const revealIO = 'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              revealIO.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
      )
    : null;

  /* root配下の .reveal 要素を監視対象に追加する。
     WordPress記事一覧など、fetch後に動的挿入される要素向けに
     window.revealNewElements として公開している。 */
  const observeReveal = (root = document) => {
    const targets = root.querySelectorAll ? root.querySelectorAll('.reveal') : [];
    targets.forEach((el) => {
      if (el.classList.contains('is-visible')) return;
      if (revealIO) {
        revealIO.observe(el);
      } else {
        el.classList.add('is-visible');
      }
    });
  };

  observeReveal(document);
  window.revealNewElements = observeReveal;

  /* ===== 施工事例ギャラリー フィルター（case.html） ===== */
  const filterForm = document.querySelector('.case-filter');
  if (filterForm) {
    const cards = Array.from(document.querySelectorAll('.case-card'));
    const emptyState = document.querySelector('.case-empty');
    const selects = Array.from(filterForm.querySelectorAll('select'));

    const applyFilter = () => {
      const values = {};
      selects.forEach((select) => { values[select.name] = select.value; });

      let visibleCount = 0;
      cards.forEach((card) => {
        const matches = Object.keys(values).every((key) => {
          return values[key] === 'all' || card.dataset[key] === values[key];
        });
        card.style.display = matches ? '' : 'none';
        if (matches) visibleCount += 1;
      });

      if (emptyState) {
        emptyState.hidden = visibleCount !== 0;
      }
    };

    selects.forEach((select) => select.addEventListener('change', applyFilter));

    const resetBtn = filterForm.querySelector('.case-filter-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        selects.forEach((select) => { select.value = 'all'; });
        applyFilter();
      });
    }
  }

  /* ===== お問い合わせフォーム（デモ用の送信ガード） ===== */
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const note = contactForm.querySelector('.form-note-result');
      if (note) {
        note.hidden = false;
        note.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }
})();
