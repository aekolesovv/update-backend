# VSEBox API

REST API для проекта VSEBox на Node.js с Express.

## Разработка

### Установка зависимостей
```bash
npm install
```

### Запуск проекта
```bash
npm start          # Запуск в продакшн режиме
npm run dev        # Запуск в режиме разработки с nodemon
```

### Проверка кода
```bash
npm run lint       # Проверка кода ESLint
npm run format     # Форматирование кода Prettier
npm run check      # Полная проверка кода
npm run fix        # Автоматическое исправление ошибок
```

### API документация
```bash
# Swagger UI доступен по адресу: http://localhost:3001/api-docs
# Документация находится в папке: docs/swagger/
```

## Конфигурация

- ESLint с конфигурацией Airbnb
- Prettier для форматирования кода
- Настройки VS Code для автоматического форматирования
- Swagger для документации API

Подробнее см. [CODE_STYLE.md](./CODE_STYLE.md)

## Технологии

- Node.js + Express
- MySQL
- JWT для аутентификации
- Swagger для документации API
- Winston для логирования

## Структура проекта

```
├── errors/          # Кастомные ошибки
├── middlewares/     # Middleware функции
├── models/          # Модели для работы с БД
├── routes/          # Маршруты API
├── utils/           # Утилиты
├── validators/      # Валидаторы
└── app.js          # Главный файл приложения
```
