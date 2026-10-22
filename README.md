# F1 Live Tracker (OpenF1 + Expo React Native)

Мобільний додаток для відстеження сесій та пілотів Формули-1 з використанням відкритого API [OpenF1](https://openf1.org).

## 🚀 Швидкий запуск

1. Встановіть залежності:
```bash
npm install
```

2. Запустіть проєкт через Expo CLI:
```bash
npx expo start
```

3. Для тестування:
- Відскануйте QR-код у додатку **Expo Go** (Android або iOS).
- Або натисніть `a` для запуску в Android Emulator, або `i` для iOS Simulator, або `w` для перегляду у браузері.

## 📁 Структура проєкту
```text
f1app/
├── src/
│   ├── navigation/
│   │   └── RootNavigator.tsx       # Стек навігації (Home -> SessionDetails)
│   ├── screens/
│   │   ├── HomeScreen.tsx          # Головний екран зі списком сесій OpenF1
│   │   └── SessionDetailsScreen.tsx# Екран пілотів вибраної сесії
│   ├── services/
│   │   └── api.ts                  # Клієнт OpenF1 API (fetch, обробка помилок)
│   └── types/
│       └── index.ts                # TypeScript інтерфейси для F1Session та F1Driver
├── App.tsx                         # Точка входу, SafeAreaProvider, F1 Dark Theme
├── app.json                        # Налаштування Expo
├── package.json
└── tsconfig.json
```
