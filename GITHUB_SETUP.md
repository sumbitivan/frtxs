# 🚀 Инструкция по загрузке на GitHub

## Шаг 1: Создайте репозиторий на GitHub

1. Откройте https://github.com/new
2. Заполните:
   - **Repository name**: `crypto-exchange-miniapp` (или любое другое имя)
   - **Description**: `Telegram Mini App for USDT/RUB exchange`
   - **Visibility**: Public (для GitHub Pages) или Private
   - **НЕ** добавляйте README, .gitignore или лицензию (они уже есть)
3. Нажмите "Create repository"

## Шаг 2: Инициализируйте Git локально

Откройте PowerShell или Git Bash в папке проекта и выполните:

```bash
cd f:\CursorProjects\crypto-exchange-miniapp

# Удалите блокировку, если есть
Remove-Item -Force -ErrorAction SilentlyContinue .git\config.lock
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue .git

# Инициализируйте git
git init

# Настройте пользователя
git config user.name "sumbitivan"
git config user.email "syedwang789@gmail.com"

# Добавьте все файлы
git add .

# Создайте первый коммит
git commit -m "Initial commit: Telegram Mini App for USDT/RUB exchange"
```

## Шаг 3: Подключите к GitHub

После создания репозитория на GitHub, вы увидите инструкции. Выполните:

```bash
# Замените YOUR_USERNAME на ваш GitHub username
git remote add origin https://github.com/YOUR_USERNAME/crypto-exchange-miniapp.git
git branch -M main
git push -u origin main
```

## Шаг 4: Включите GitHub Pages

1. Откройте ваш репозиторий на GitHub
2. Перейдите в **Settings** → **Pages**
3. В разделе **Source** выберите:
   - Branch: `main`
   - Folder: `/ (root)` или `/standalone.html`
4. Нажмите **Save**
5. Ваше приложение будет доступно по адресу:
   `https://YOUR_USERNAME.github.io/crypto-exchange-miniapp/standalone.html`

## Шаг 5: Настройте Mini App в BotFather

1. Откройте [@BotFather](https://t.me/BotFather)
2. Отправьте `/newapp`
3. Выберите вашего бота
4. Укажите URL: `https://YOUR_USERNAME.github.io/crypto-exchange-miniapp/standalone.html`
5. Готово! 🎉

## Альтернативный способ (через GitHub Desktop)

1. Установите [GitHub Desktop](https://desktop.github.com/)
2. Откройте GitHub Desktop
3. File → Add Local Repository
4. Выберите папку `f:\CursorProjects\crypto-exchange-miniapp`
5. Publish repository
6. Следуйте инструкциям

## ⚠️ Важно

- **НЕ** коммитьте файл `.env` с токенами
- Убедитесь, что `.gitignore` содержит `.env`
- После пуша проверьте, что файл `.env` не попал в репозиторий

## 📝 Быстрая команда (если все работает)

```bash
cd f:\CursorProjects\crypto-exchange-miniapp
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/crypto-exchange-miniapp.git
git push -u origin main
```

Замените `YOUR_USERNAME` на ваш GitHub username!
