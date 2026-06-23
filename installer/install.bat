@echo off
title Interview Prep App - First Time Setup
color 0A

echo ============================================
echo  Interview Prep App - Setup
echo ============================================
echo.

REM Move to the app root folder (one level up from installer)
cd /d "%~dp0.."

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [!] Python not found. Opening download page...
    start https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe
    echo     Download Python 3.11, tick "Add to PATH", then re-run this script.
    pause
    exit /b 1
)

echo [OK] Python found.

REM Create venv if not already created
if not exist "venv\Scripts\activate" (
    echo [..] Creating virtual environment...
    python -m venv venv
    echo [OK] Virtual environment created.
)

REM Activate venv and install all packages
echo [..] Installing packages (first run may take a few minutes)...
call venv\Scripts\activate
python -m pip install --upgrade pip --quiet
python -m pip install -r requirements.txt

echo.
echo ============================================
echo  Setup complete! Launching app...
echo ============================================
python interview_prep_assistant_revised.py
pause
