@echo off
rem Greets the name given as the first argument. SERN passes it quoted ("Mai Tester"):
rem use %1 as it is, or "%~1" in quotes. A bare %~1 drops the quotes, and cmd would then
rem run whatever follows a "&" in the name.
echo Hello, %1
echo Running in "%CD%"
echo From "%~dp0"
