# 刈谷市体育館空き状況チェッカー

刈谷市のバドミントン施設の空き状況を簡単に確認できるWebアプリケーションです。

## 機能

- 🏸 バドミントン施設の空き状況確認
- 📅 日付選択機能
- 🎨 レスポンシブデザイン
- ⚡ リアルタイムデータ取得（本番環境）
- 🐳 Docker対応開発環境

## 技術スタック

- **フロントエンド**: Next.js 14, React, TypeScript, TailwindCSS
- **バックエンド**: Next.js API Routes, Puppeteer
- **デプロイ**: Vercel
- **開発環境**: Docker

## 開発環境での実行

1. リポジトリのクローン
```bash
git clone <repository-url>
cd GymChecker
```

2. Dockerでの実行
```bash
docker compose up -d
```

3. ブラウザで開く
```
http://localhost:3000
```

## ローカル開発（Node.js）

```bash
npm install
npm run dev
```

## デプロイ

Vercelでの自動デプロイに対応しています。

### Vercelでのデプロイ手順

1. GitHubリポジトリを作成
2. Vercelアカウントでリポジトリを連携
3. 自動デプロイが実行されます

## 注意事項

- 開発環境ではモックデータを表示します
- 本番環境では実際の刈谷市スポーツ施設予約システムからデータを取得します
- スクレイピング処理のため、レスポンス時間が数秒かかる場合があります

## ライセンス

MIT License
