<#
  Runs, installs or builds the driver app in one of two modes.

    real  the live server (api.way-point.site), no demo data. The normal app.
    demo  built-in demo data: a short Colombo trip, no server, no "demo" text on
          screen. Settings live in config/demo.json.

  Examples (from mobile/driver_app):
    ./tool/app.ps1 -Mode demo -Action install -Device R7AX70AM4EB   # phone, demo
    ./tool/app.ps1 -Mode real -Action install -Device R7AX70AM4EB   # phone, real
    ./tool/app.ps1 -Mode demo -Action run                           # hot reload
    ./tool/app.ps1 -Mode real -Action apk                           # release APK to share
    ./tool/app.ps1 -Mode demo -Action test -Device emulator-5554    # plays the whole trip

  Find device ids with `flutter devices`.
#>
param(
  [ValidateSet('real', 'demo')][string]$Mode = 'real',
  [ValidateSet('run', 'install', 'apk', 'test')][string]$Action = 'run',
  [string]$Device = ''
)

Set-Location (Split-Path $PSScriptRoot -Parent)
$defines = @()
if ($Mode -eq 'demo') { $defines = @('--dart-define-from-file=config/demo.json') }
$target = @()
if ($Device) { $target = @('-d', $Device) }

switch ($Action) {
  'run' { flutter run @target @defines }
  'install' {
    # Debug build so it can be installed straight onto a connected device.
    flutter build apk --debug @defines
    if ($LASTEXITCODE -eq 0) { flutter install --debug @target }
  }
  'apk' {
    # A release build has no demo mode at all, whatever the flags say.
    if ($Mode -eq 'demo') { Write-Warning 'Release builds never include demo mode; building the real app.' }
    flutter build apk --release --split-per-abi
    Write-Host 'Share build/app/outputs/flutter-apk/app-arm64-v8a-release.apk'
  }
  'test' {
    flutter test integration_test/demo_trip_test.dart @target @defines
  }
}
