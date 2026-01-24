# Скрипт для локального запуска бота и Mini App

Write-Host "🚀 Запуск бота и Mini App локально..." -ForegroundColor Cyan
Write-Host ""

# Проверяем наличие Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js установлен: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js не установлен!" -ForegroundColor Red
    Write-Host "Скачайте и установите Node.js с https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Запускаем простой HTTP сервер для Mini App
Write-Host "🌐 Запуск локального сервера для Mini App..." -ForegroundColor Yellow

$port = 8080
$serverScript = @"
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = $port;
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json'
};

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') filePath = './index.html';
    if (filePath === './test') filePath = './test.html';

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(port, () => {
    console.log('🌐 Сервер запущен на http://localhost:' + port + '/');
    console.log('📱 Откройте test.html для тестирования в браузере');
    console.log('⏹️  Для остановки нажмите Ctrl+C');
});
"@

$serverScript | Out-File -FilePath "server.js" -Encoding utf8

# Запускаем сервер в фоне
Write-Host "Запуск HTTP сервера на порту $port..." -ForegroundColor Yellow
$serverProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -PassThru -NoNewWindow

Start-Sleep -Seconds 2

# Открываем браузер
Write-Host "Открываю Mini App в браузере..." -ForegroundColor Yellow
Start-Process "http://localhost:$port/test.html"

Write-Host ""
Write-Host "✅ Mini App доступен по адресу: http://localhost:$port/" -ForegroundColor Green
Write-Host "📱 Для тестирования в Telegram:" -ForegroundColor Cyan
Write-Host "   1. Запустите бота: node bot-simple.js" -ForegroundColor White
Write-Host "   2. Откройте вашего бота в Telegram" -ForegroundColor White
Write-Host "   3. Отправьте команду /start" -ForegroundColor White
Write-Host ""
Write-Host "⏹️  Для остановки сервера закройте это окно или нажмите Ctrl+C" -ForegroundColor Yellow
Write-Host ""

# Ждем завершения
try {
    Wait-Process -Id $serverProcess.Id
} catch {
    Write-Host "Сервер остановлен" -ForegroundColor Yellow
}
