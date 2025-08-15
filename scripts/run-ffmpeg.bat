@echo off
setlocal
set BGVID=%1
set MOCKIMG=%2
set FILTERFILE=%3
set OUTPUT=%4
set /p FILTER=<%FILTERFILE%
ffmpeg -y -i "%BGVID%" -i "%MOCKIMG%" -filter_complex "%FILTER%" -map "[out]" -c:v libx264 -crf 23 -preset veryfast -t 4 "%OUTPUT%"
