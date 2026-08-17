# 世田谷くらしリフォーム デモサイト

静的HTML/CSS/JSサイトに、WordPressをヘッドレスCMSとして使った
お知らせ・ブログ機能（`/blog.html` 一覧・`/post.html` 詳細）を組み込んでいます。

このサイトはNext.jsのようなビルドステップを持たない静的サイトのため、
記事データはページを開いたブラウザ上でWordPress REST APIに直接アクセスして取得・表示します
（サーバーサイドのビルド時取得ではありません＝WordPress側で記事を公開すれば、
サイトを再ビルド・再デプロイしなくても即座に反映されます）。

## 構成

```
web/project/
├─ blog.html              … 記事一覧ページ（WordPress REST APIから取得）
├─ post.html               … 記事詳細ページ（?slug=xxx で対象記事を指定）
├─ index.html / case.html / services.html / contact.html … 既存ページ（変更なし）
└─ assets/
   ├─ js/
   │  ├─ wp-config.js      … WordPress接続設定（★ここを書き換えます）
   │  ├─ blog.js            … 記事取得・描画ロジック
   │  └─ main.js             … ハンバーガーメニュー／スクロールアニメーション等（既存）
   ├─ mock-wp/posts.json    … デモ用ダミー記事データ（本番接続後は不要）
   └─ css/style.css         … 全ページ共通スタイル
```

## 現在の状態：デモモードで稼働中

本番のWordPressをまだ用意していないため、現在は `assets/mock-wp/posts.json`
（WordPress REST APIと全く同じ形式のダミーデータ）を読み込んで動作しています。
`/blog.html` ・ `/post.html` を開くと、実際にWordPressへ接続した場合と同じ見た目・
挙動（一覧・ページネーション・記事詳細・アイキャッチ画像・カテゴリー表示）を確認できます。

## WordPress接続設定（環境変数の代わり）

このサイトはビルド不要の静的HTMLなので、`.env` のような環境変数の仕組みはありません。
代わりに **`assets/js/wp-config.js` の1ファイル** がその役割を果たします。

```js
// assets/js/wp-config.js
const WP_DEMO_MODE = true;   // ← 本番接続時は false に変更
const WP_API_BASE = 'https://YOUR-WORDPRESS-SITE.example.com/wp-json/wp/v2';
```

実際のWordPressを用意したら、以下の2点を変更してください。

1. `WP_DEMO_MODE` を `false` に変更する（`assets/mock-wp/posts.json` を使わなくなります）
2. `WP_API_BASE` の `YOUR-WORDPRESS-SITE.example.com` を実際のWordPressサイトの
   ドメインに書き換える

`blog.html` ・ `post.html` の両方がこの1ファイルを共通で読み込むため、変更箇所はここだけです。
デモモードと本番モードで描画ロジック（`blog.js`）は完全に共通のため、切り替えても
見た目や挙動は変わりません。

`WP_DEMO_MODE` が `false` で、かつ `WP_API_BASE` が未設定（プレースホルダーのまま）の間は、`/blog.html` ・ `/post.html` に
「WordPressの接続先が未設定です」という案内文が表示されます（エラーで真っ白になることはありません）。

同じファイルの `WP_POSTS_PER_PAGE`（既定6件）で、一覧ページの1ページあたりの表示件数を変更できます。

## WordPress側で必要な設定

1. **パーマリンク設定を「投稿名」に変更**
   WordPress管理画面 → 設定 → パーマリンク → 「投稿名」を選択して保存。
   これによりREST APIが返す `slug` がそのまま `/post.html?slug=◯◯` のURLに使えます。

2. **REST APIの公開GETアクセスを確認**
   公開済み記事であれば認証不要で取得できるのが既定の挙動です。
   下記のように `curl` でJSONが返ってくることを確認してください（`_embed` はアイキャッチ画像・
   カテゴリー情報を一緒に取得するためのパラメータです）。

   ```bash
   curl "https://WordPressのURL/wp-json/wp/v2/posts?_embed"
   ```

3. **CORS設定（重要・忘れやすいポイント）**
   本サイトとWordPressはドメインが異なる（クロスオリジン）ため、WordPress側でCORSを
   許可する設定が必要です。デフォルトのWordPressは、本サイトのドメインからの
   `fetch()` を許可しません。テーマの `functions.php` に以下を追記するか、
   CORS設定が行えるプラグインを導入してください。

   ```php
   add_action('rest_api_init', function () {
       remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
       add_filter('rest_pre_serve_request', function ($value) {
           header('Access-Control-Allow-Origin: https://本サイトの公開ドメイン');
           header('Access-Control-Expose-Headers: X-WP-Total, X-WP-TotalPages');
           return $value;
       });
   }, 15);
   ```

   `Access-Control-Expose-Headers` の指定を忘れると、記事一覧の**取得自体は成功するのに
   ページネーション（2ページ目以降へのリンク）だけが表示されない**という気づきにくい不具合が
   起こります（動作確認済みの実際の挙動です）。忘れずに含めてください。

4. **不要なデフォルトプラグイン・テーマの無効化**
   投稿・カテゴリー・アイキャッチ画像の入力以外に使わない場合は、初期状態の
   サンプルプラグイン・テーマを無効化して問題ありません（REST APIの `posts` エンドポイントの
   挙動には影響しません）。

## 表示の仕組み（実装メモ）

- `blog.html` は `/wp-json/wp/v2/posts?_embed&per_page=6&page=N` を取得し、
  サムネイル（アイキャッチ画像）・タイトル・抜粋・投稿日・カテゴリーをカード表示します。
  `X-WP-TotalPages` レスポンスヘッダーからページ数を判定し、2ページ目以降がある場合のみ
  ページ送りを表示します。
- `post.html?slug=◯◯` は `/wp-json/wp/v2/posts?slug=◯◯&_embed` を取得し、
  本文（`content.rendered` をそのまま描画。WordPressブロックエディタの見出し・リスト・画像・
  引用などの装飾はそのまま反映されます）・アイキャッチ画像・カテゴリー・投稿日を表示します。
- 該当記事が見つからない場合、WordPress未接続の場合は、エラーで壊れる代わりに
  案内メッセージを表示します。
- 一覧・詳細どちらも読み込み後、既存のフェードインアップ演出（`assets/js/main.js`）の
  対象に自動的に加わります。

## 動作確認方法

`web/project/` は必ずHTTPサーバー経由で開いてください（`file://` で直接開くと、
デモモードのJSON取得・本番のWordPress fetch のどちらもブラウザのCORS制限で失敗します）。

```bash
cd web/project
python3 -m http.server 8000
```

- **デモモードのまま確認する場合**：そのまま `http://localhost:8000/blog.html` を開けば、
  `assets/mock-wp/posts.json` の内容が一覧表示されます。追加の設定は不要です。
- **本番のWordPressで確認する場合**：`assets/js/wp-config.js` を書き換えたうえで、
  `http://localhost:8000/blog.html` を開き、WordPressに投稿した記事が一覧表示されることを
  確認してください。
- 一覧の記事をクリックし、`post.html?slug=◯◯` で本文が表示されることを確認してください。
