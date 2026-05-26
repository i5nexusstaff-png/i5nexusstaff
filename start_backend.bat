@echo off
echo ================================
echo  Starting i5 Nexus Backend
echo  Django + PostgreSQL API
echo ================================
cd /d D:\i5nexus\backend
C:\Users\georg\AppData\Local\Programs\Python\Python39\python.exe manage.py runserver 8000
pause
