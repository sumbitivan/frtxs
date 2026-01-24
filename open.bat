@echo off
chcp 65001 >nul
echo Opening currency exchange app...
start "" "%~dp0standalone.html"
