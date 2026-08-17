(() => {
  'use strict';

  if (typeof WP_API_BASE === 'undefined') {
    console.error('wp-config.js が読み込まれていません。blog.js より前に読み込んでください。');
    return;
  }

  const demoMode = typeof WP_DEMO_MODE !== 'undefined' && WP_DEMO_MODE;
  const isConfigured = demoMode || !/YOUR-WORDPRESS-SITE\.example\.com/.test(WP_API_BASE);

  const formatDate = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  const stripHtml = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || '').replace(/\s+/g, ' ').trim();
  };

  const getFeaturedImageUrl = (post) => {
    const media = post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0];
    if (media && !media.code) {
      return (media.media_details && media.media_details.sizes && media.media_details.sizes.medium_large
        ? media.media_details.sizes.medium_large.source_url
        : media.source_url) || null;
    }
    return null;
  };

  const getCategoryName = (post) => {
    const terms = post._embedded && post._embedded['wp:term'];
    if (!terms) return 'お知らせ';
    const categories = terms.find((group) => group.length && group[0].taxonomy === 'category');
    return categories && categories[0] ? categories[0].name : 'お知らせ';
  };

  const showError = (container, message) => {
    container.innerHTML = `<p class="wp-error">${message}</p>`;
  };

  /* デモモード用データキャッシュ（posts.json を一度だけ取得して使い回す） */
  let demoDataPromise = null;
  const loadDemoData = () => {
    if (!demoDataPromise) {
      demoDataPromise = fetch(WP_DEMO_DATA_URL).then((res) => {
        if (!res.ok) throw new Error(`デモデータの読み込みに失敗しました（status: ${res.status}）`);
        return res.json();
      });
    }
    return demoDataPromise;
  };

  /* 一覧取得：本番はWordPress REST API、デモモードはローカルJSONをページング・並び替えして同じ形で返す */
  const fetchPostList = (page, perPage) => {
    if (demoMode) {
      return loadDemoData().then((all) => {
        const sorted = [...all].sort((a, b) => new Date(b.date) - new Date(a.date));
        const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
        const start = (page - 1) * perPage;
        return { posts: sorted.slice(start, start + perPage), totalPages };
      });
    }

    const url = `${WP_API_BASE}/posts?_embed&per_page=${perPage}&page=${page}`;
    return fetch(url).then(async (res) => {
      if (!res.ok) throw new Error(`WordPress REST APIへの接続に失敗しました（status: ${res.status}）`);
      const totalPages = parseInt(res.headers.get('X-WP-TotalPages') || '1', 10);
      const posts = await res.json();
      return { posts, totalPages };
    });
  };

  /* 詳細取得：本番はWordPress REST API、デモモードはローカルJSONからslug一致を探す */
  const fetchPostBySlug = (slug) => {
    if (demoMode) {
      return loadDemoData().then((all) => all.find((p) => p.slug === slug) || null);
    }
    return fetch(`${WP_API_BASE}/posts?slug=${encodeURIComponent(slug)}&_embed`).then((res) => {
      if (!res.ok) throw new Error(`WordPress REST APIへの接続に失敗しました（status: ${res.status}）`);
      return res.json().then((posts) => posts[0] || null);
    });
  };

  /* ===================== 記事一覧 =====================
     data-wp-list を持つ要素はページ内に複数あってよい:
       - blog.html の一覧本体（data-limit なし）… URLの ?page= とページネーション対応
       - index.html のトップページ埋め込みプレビュー（data-limit="3" など）… 常に最新N件、ページネーションなし
  */
  const renderPostCard = (post, i) => {
    const img = getFeaturedImageUrl(post);
    const category = getCategoryName(post);
    const excerpt = stripHtml(post.excerpt.rendered);
    const delayClass = `reveal-${(i % 3) + 1}`;
    return `
      <a class="blog-card reveal ${delayClass}" href="post.html?slug=${encodeURIComponent(post.slug)}">
        <div class="blog-card-thumb">
          ${img ? `<img src="${img}" alt="" loading="lazy">` : '<div class="blog-card-thumb-fallback"></div>'}
        </div>
        <div class="blog-card-body">
          <div class="blog-meta">
            <span class="blog-date">${formatDate(post.date)}</span>
            <span class="blog-category">${category}</span>
          </div>
          <h3>${post.title.rendered}</h3>
          <p>${excerpt}</p>
        </div>
      </a>
    `;
  };

  document.querySelectorAll('[data-wp-list]').forEach((listEl) => {
    const limit = parseInt(listEl.dataset.limit, 10) || null;
    const paginationEl = limit ? null : document.querySelector('[data-wp-pagination]');
    const params = new URLSearchParams(window.location.search);
    const currentPage = limit ? 1 : Math.max(1, parseInt(params.get('page'), 10) || 1);
    const perPage = limit || WP_POSTS_PER_PAGE;

    /* このページにはHTML内にあらかじめ1ページ目相当の記事カードを静的に埋め込んでいる
       （SEOクローラーやJS未実行環境でも本文が読めるように、また初回表示のちらつきを防ぐため）。
       1ページ目を表示する場合はその内容をそのまま使い、再取得・再描画はしない。
       ?page=2 以降やWordPress接続後の実データはこれまで通りfetchで取得する。 */
    if (listEl.dataset.prerendered === 'true' && currentPage === 1 && demoMode) {
      return;
    }

    if (!isConfigured) {
      showError(
        listEl,
        'WordPressの接続先が未設定です。assets/js/wp-config.js の WP_API_BASE をWordPressサイトのURLに書き換えてください。'
      );
      return;
    }

    listEl.innerHTML = '<p class="wp-loading">読み込み中…</p>';

    fetchPostList(currentPage, perPage)
      .then(({ posts, totalPages }) => {
        if (!posts.length) {
          listEl.innerHTML = '<p class="wp-empty">まだ記事が投稿されていません。</p>';
          return;
        }

        listEl.innerHTML = posts.map(renderPostCard).join('');

        if (window.revealNewElements) window.revealNewElements(listEl);

        if (paginationEl && totalPages > 1) {
          const items = [];
          for (let p = 1; p <= totalPages; p += 1) {
            items.push(
              p === currentPage
                ? `<span class="page-link is-current">${p}</span>`
                : `<a class="page-link" href="blog.html?page=${p}">${p}</a>`
            );
          }
          paginationEl.innerHTML = items.join('');
        }
      })
      .catch((err) => {
        showError(listEl, `記事の取得に失敗しました。WordPressのURL・REST APIの公開設定をご確認ください。（${err.message}）`);
      });
  });

  /* ===================== 記事詳細（post.html） ===================== */
  const articleEl = document.querySelector('[data-wp-article]');
  if (articleEl) {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');

    if (!isConfigured) {
      showError(
        articleEl,
        'WordPressの接続先が未設定です。assets/js/wp-config.js の WP_API_BASE をWordPressサイトのURLに書き換えてください。'
      );
    } else if (!slug) {
      showError(articleEl, '記事が指定されていません。<a href="blog.html">お知らせ・ブログ一覧に戻る</a>');
    } else {
      articleEl.innerHTML = '<p class="wp-loading">読み込み中…</p>';

      fetchPostBySlug(slug)
        .then((post) => {
          if (!post) {
            showError(articleEl, '指定された記事が見つかりませんでした。<a href="blog.html">お知らせ・ブログ一覧に戻る</a>');
            return;
          }

          document.title = `${stripHtml(post.title.rendered)}｜世田谷くらしリフォーム`;

          const img = getFeaturedImageUrl(post);
          const category = getCategoryName(post);

          articleEl.innerHTML = `
            <p class="post-breadcrumb"><a href="index.html">トップ</a> ／ <a href="blog.html">お知らせ・ブログ</a> ／ ${stripHtml(post.title.rendered)}</p>
            <div class="post-meta">
              <span class="blog-date">${formatDate(post.date)}</span>
              <span class="blog-category">${category}</span>
            </div>
            <h1 class="post-title">${post.title.rendered}</h1>
            ${img ? `<img src="${img}" alt="" class="post-featured-img">` : ''}
            <div class="post-content">${post.content.rendered}</div>
            <p class="post-back"><a href="blog.html">← お知らせ・ブログ一覧に戻る</a></p>
          `;
        })
        .catch((err) => {
          showError(articleEl, `記事の取得に失敗しました。WordPressのURL・REST APIの公開設定をご確認ください。（${err.message}）`);
        });
    }
  }
})();
