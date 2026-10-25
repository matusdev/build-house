# WOODPANELS — Next.js

3D-конфигуратор дома из деревянных панелей. Перенос Gulp/Pug-версии из корня проекта на Next.js 16 (App Router, TypeScript, Sass).

Нужна Node 20.9+.

```bash
npm i
npm run dev     # http://localhost:3000
npm run build   # продакшен-сборка, страница пререндерится статикой
npm run start
npm run lint
```

## Структура

```
src/
  app/          layout.tsx (шрифт Onest, meta, viewport), page.tsx, icon.svg
  components/   разметка страницы — серверные компоненты (бывшие pug-шаблоны)
                + SiteEngine.tsx — клиентский компонент, который запускает движок
  content/      i18n.ts — словарь ru/uk/en и формат цен; steps.ts — шаги и цены; contacts.ts
  engine/       движок из frontend/js: three.js-сцена, дом, пейзаж, превью, интерфейс (ui.js)
  styles/       SCSS из frontend/scss без изменений (кроме путей @use и шрифта)
```

## Как это устроено

- Страница рендерится на сервере на русском. После гидрации `SiteEngine` отдельным чанком
  подгружает `engine/ui.js` и вызывает `Site.init()` — дальше всё как в старой версии:
  движок сам работает с DOM, переключает классы на `<html>`, разбивает заголовки на буквы, считает цены.
- Движок находит элементы по `id`, классам и `data-*` атрибутам, поэтому при правке разметки
  в `components/` их нужно сохранять.
- Тексты для всех языков — в `content/i18n.ts`. Из этого же словаря рендерит сервер и переключает
  язык движок (`?lang=en`, выбор запоминается в `localStorage`).
- three.js, gsap и lenis ставятся из npm (те же версии, что раньше лежали в `public/js`).
