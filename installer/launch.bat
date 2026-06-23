@echo off
REM Daily launcher - activate venv and run app
cd /d "%~dp0.."
call venv\Scripts\activate
python interview_prep_assistant_revised.py
