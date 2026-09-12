import './globals.css';

export const metadata = {
  title: 'Creative QC — Контроль качества креативов Meta Ads',
  description:
    'Веб-сервис для проверки рекламных креативов перед публикацией в Meta Ads. Чек-лист по политикам Meta, техническим требованиям, бренд-стандартам и качеству видео-продакшена.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎬</text></svg>" />
      </head>
      <body>{children}</body>
    </html>
  );
}
