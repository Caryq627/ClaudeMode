# ClaudeMode

Epic terminal animations and multi-window layouts for [Claude Code](https://claude.ai/code).

![macOS](https://img.shields.io/badge/macOS-Terminal.app-blue)
![Bash](https://img.shields.io/badge/bash-script-orange)

## Quick Install

```bash
curl -sL https://raw.githubusercontent.com/Caryq627/ClaudeMode/main/install.sh | bash
```

Or clone and run:

```bash
git clone https://github.com/Caryq627/ClaudeMode.git
cd ClaudeMode
bash install.sh
```

## Commands

| Command | Description |
|---------|-------------|
| `claude` | Launch Claude with cinematic boot animation (rain, logo reveal, glitch effects) |
| `claudelaunch` | Boot animation with color theme: `orange` `cyan` `magenta` `green` `blue` `purple` |
| `claudemode` | 4 Claude windows in screen quadrants, each with a different color theme |
| `claudewall` | 6 Claude windows in a 3x2 grid, all 6 color themes |
| `clauderain` | Matrix-style falling rain screensaver in Claude's amber/orange palette |
| `claudeglow` | Apply neon cyberpunk color theme to Terminal (`claudeglow reset` to revert) |
| `terminate` | Close the current Terminal window |
| `terminateall` | Close all Terminal windows |
| `mycommands` | Show the full command reference |

## The Boot Animation

When you type `claude` (or any of the multi-window commands), you get:

1. **Matrix Rain** -- themed color rain fills the screen
2. **Scanline Logo Reveal** -- CLAUDE CODE logo renders top-to-bottom as rain clears
3. **Tagline + Loading Bar** -- types out with retro loading effect
4. **Glitch Out** -- logo starts flickering, glitching, and breaking apart with increasing chaos
5. **Terminator Shutdown** -- screen collapses vertically, shrinks to a horizontal line, then a dot, then gone
6. **Claude launches** into a clean terminal

## Multi-Window Layouts

`claudemode` opens 4 windows in screen quadrants, each with its own color theme (orange, cyan, magenta, green) -- all playing the boot animation simultaneously.

`claudewall` opens 6 windows in a 3x2 grid with all 6 themes.

Both respect the macOS Dock position and add proper spacing between windows.

## Requirements

- macOS with Terminal.app
- [Claude Code](https://claude.ai/code) installed (`brew install claude-code` or npm)
- Bash 3.2+ (ships with macOS)

## License

MIT
