@echo off
setlocal
set "MATH_TEACHING_STUDIO_ROOT=%~dp0"
powershell.exe -NoProfile -Command "$entry = Join-Path $env:MATH_TEACHING_STUDIO_ROOT 'preview.cjs'; $node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source; if (-not $node) { $node = Join-Path $env:LOCALAPPDATA 'Programs\nodejs\node.exe' }; if (Test-Path -LiteralPath $node) { $quoted = [char]34 + $entry + [char]34; Start-Process -WindowStyle Hidden -FilePath $node -ArgumentList $quoted,'--open' } else { Start-Process -FilePath (Join-Path $env:MATH_TEACHING_STUDIO_ROOT 'index.html') }"
