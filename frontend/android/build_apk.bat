@echo off
set "JAVA_HOME=D:\tools\jdk-17.0.12+7"
set "ANDROID_HOME=D:\AndroidSDK"
set "PATH=D:\tools\jdk-17.0.12+7\bin;D:\AndroidSDK\platform-tools;%PATH%"

cd /d "d:\duanpos-ongchu\frontend\android"
call gradlew.bat assembleRelease --no-daemon
