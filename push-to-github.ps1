# Скрипт для загрузки проекта на GitHub
# Запустите: powershell -ExecutionPolicy Bypass -File push-to-github.ps1

Write-Host "🚀 Подготовка проекта для GitHub..." -ForegroundColor Cyan
Write-Host ""

$projectPath = "f:\CursorProjects\crypto-exchange-miniapp"
Set-Location $projectPath

# Проверка наличия git
try {
    $gitVersion = git --version
    Write-Host "✅ Git установлен: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git не установлен!" -ForegroundColor Red
    Write-Host "Скачайте Git с https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

# Удаление старой блокировки, если есть
Write-Host "🧹 Очистка старых файлов..." -ForegroundColor Yellow
if (Test-Path ".git") {
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue .git
    Start-Sleep -Seconds 1
}

# Инициализация git
Write-Host "📦 Инициализация Git репозитория..." -ForegroundColor Yellow
git init

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка инициализации Git" -ForegroundColor Red
    exit 1
}

# Настройка пользователя
Write-Host "👤 Настройка пользователя Git..." -ForegroundColor Yellow
git config user.name "sumbitivan"
git config user.email "syedwang789@gmail.com"

# Добавление файлов
Write-Host "📝 Добавление файлов..." -ForegroundColor Yellow
git add .

# Проверка, что .env не добавлен
$envInGit = git ls-files | Select-String ".env"
if ($envInGit) {
    Write-Host "⚠️  ВНИМАНИЕ: Файл .env найден в git!" -ForegroundColor Red
    Write-Host "Удаляю .env из индекса..." -ForegroundColor Yellow
    git reset HEAD .env
    git rm --cached .env
}

# Создание коммита
Write-Host "💾 Создание коммита..." -ForegroundColor Yellow
git commit -m "Initial commit: Telegram Mini App for USDT/RUB exchange with settings, themes, and multi-language support"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка создания коммита" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Проект готов к загрузке на GitHub!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Следующие шаги:" -ForegroundColor Cyan
Write-Host "1. Создайте репозиторий на https://github.com/new" -ForegroundColor White
Write-Host "2. Выполните команды:" -ForegroundColor White
Write-Host ""
Write-Host "   git remote add origin https://github.com/YOUR_USERNAME/crypto-exchange-miniapp.git" -ForegroundColor Yellow
Write-Host "   git branch -M main" -ForegroundColor Yellow
Write-Host "   git push -u origin main" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Включите GitHub Pages в настройках репозитория" -ForegroundColor White
Write-Host "4. Настройте Mini App в @BotFather с URL вашего GitHub Pages" -ForegroundColor White
Write-Host ""
Write-Host "Подробные инструкции в файле GITHUB_SETUP.md" -ForegroundColor Cyan
