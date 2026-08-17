/*
 * WordPress REST API 接続設定
 *
 * ■ デモモード（現在の設定）
 * 実際のWordPressをまだ用意していないデモサイトのため、WP_DEMO_MODE を true にして
 * assets/mock-wp/posts.json（WordPress REST APIと同じ形式のダミーデータ）を読み込んでいます。
 * blog.html / post.html の表示・挙動は、本物のWordPressに接続した場合と同じです。
 *
 * ■ 実際のWordPressに接続する場合
 * 1. 下の WP_DEMO_MODE を false に変更する
 * 2. WP_API_BASE をWordPressサイトのURLに書き換える
 *    例）https://blog.setagaya-kurashi-reform.com が WordPress の場合:
 *      const WP_API_BASE = 'https://blog.setagaya-kurashi-reform.com/wp-json/wp/v2';
 * 変更箇所はこのファイルのみです（blog.html / post.html 共通で読み込まれます）。
 */
const WP_DEMO_MODE = true;
const WP_DEMO_DATA_URL = 'assets/mock-wp/posts.json';

const WP_API_BASE = 'https://YOUR-WORDPRESS-SITE.example.com/wp-json/wp/v2';

/* 記事一覧の1ページあたりの表示件数 */
const WP_POSTS_PER_PAGE = 6;
