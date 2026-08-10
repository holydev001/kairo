# Kairo beta distribution

Kairo beta builds are distributed as x64 Windows installers through GitHub Releases. The installer is the fastest path for testing with real users while the Microsoft Store listing is prepared separately.

## Build a local installer

```powershell
pnpm install
pnpm check
pnpm package:win
```

The installer is written to `release/` and is named like `Kairo-Setup-0.1.0-beta.1-x64.exe`.

## Publish a beta

After the release pull request is merged into `main`:

1. Pull the latest protected `main` branch.
2. Confirm that `package.json` contains the beta version being released.
3. Create an annotated tag matching that version.
4. Push only the tag. The beta workflow builds the installer and creates a GitHub prerelease.

```powershell
git switch main
git pull --ff-only origin main
git tag -a v0.1.0-beta.1 -m "Kairo 0.1.0 beta 1"
git push origin v0.1.0-beta.1
```

Never tag an unmerged feature branch.

## Tester checklist

Test each beta on a clean Windows user account where possible:

- install, launch, close, and relaunch Kairo
- confirm the Kairo icon appears in the installer, Start menu, taskbar, and desktop shortcut
- create a journal entry and restart the app to verify persistence
- create and restore a local backup
- enable widgets at login, restart Windows, and verify their placement and settings
- press Windows+D and confirm persistent widgets remain visible
- uninstall Kairo and confirm personal data is retained
- reinstall and confirm the existing journal is detected

Report the Kairo version, Windows version, reproduction steps, expected result, and screenshots with each issue.

## Signing and SmartScreen

The first private beta installer is unsigned. Windows may show a SmartScreen warning because the binary has no established publisher reputation. Public distribution should use a CA-trusted code-signing certificate or a Microsoft Store MSIX submission before promoting Kairo out of beta.

## Microsoft Store path

Keep the GitHub installer as the beta channel. Once installation, startup, backup, widgets, and upgrades are stable, prepare an MSIX package and Partner Center listing for the public channel. The Store path requires reserved product identity, listing assets, privacy/support URLs, age rating, certification testing, and Store-specific package metadata.
