#!/bin/bash
# claude-commands-installer.sh
# Installs custom Claude Code launcher commands to ~/.local/bin/
# Self-contained: all file contents are embedded below.

set -e

ORANGE='\033[38;5;208m'
AMBER='\033[38;5;214m'
GOLD='\033[38;5;220m'
DIM='\033[38;5;240m'
WHITE='\033[1;37m'
BOLD='\033[1m'
GREEN='\033[38;5;46m'
RED='\033[38;5;196m'
RST='\033[0m'

echo ""
echo -e "${ORANGE}${BOLD}  ═══════════════════════════════════════════════════════${RST}"
echo -e "${GOLD}${BOLD}     ⚡ Claude Commands Installer ⚡${RST}"
echo -e "${ORANGE}${BOLD}  ═══════════════════════════════════════════════════════${RST}"
echo ""
echo -e "  ${DIM}This installer will set up the following commands:${RST}"
echo -e "  ${AMBER}claudelaunch${RST}  ${AMBER}claudemode${RST}  ${AMBER}claudewall${RST}  ${AMBER}claudeglow${RST}"
echo -e "  ${AMBER}clauderain${RST}    ${AMBER}terminate${RST}   ${AMBER}terminateall${RST}  ${AMBER}mycommands${RST}"
echo -e "  ${DIM}Plus a ${WHITE}claude${DIM} wrapper function in your shell rc.${RST}"
echo ""

# ── Detect claude binary ──────────────────────────────────────────────
CLAUDE_BIN=$(which claude 2>/dev/null || true)
if [[ -z "$CLAUDE_BIN" ]]; then
    echo -e "  ${RED}WARNING:${RST} 'claude' not found in PATH."
    echo -e "  ${DIM}Falling back to /opt/homebrew/bin/claude${RST}"
    echo -e "  ${DIM}You can edit ~/.local/bin/claudelaunch later if needed.${RST}"
    CLAUDE_BIN="/opt/homebrew/bin/claude"
else
    echo -e "  ${GREEN}Found claude at:${RST} ${CLAUDE_BIN}"
fi
echo ""

# ── Create target directory ───────────────────────────────────────────
INSTALL_DIR="$HOME/.local/bin"
mkdir -p "$INSTALL_DIR"
echo -e "  ${DIM}Install directory: ${WHITE}${INSTALL_DIR}${RST}"

# ── Write claudelaunch ────────────────────────────────────────────────
# Note: We write the file with a placeholder and then replace the exec line
# to use the detected claude path.
cat > "$INSTALL_DIR/claudelaunch" << 'ENDOFCLAUDELAUNCH'
#!/bin/bash
# claudelaunch — rain → scanline logo reveal → hold → glitch → terminator → Claude
THEME="${1:-orange}"

case "$THEME" in
    cyan)
        BG_RGB="0a/16/1f"  ; FG_RGB="4e/e0/e6"  ; CUR_RGB="00/e5/ff"
        BG_ANSI="{2570, 5654, 7967}"  ; FG_ANSI="{20046, 57568, 58982}"  ; CUR_ANSI="{0, 58853, 65535}"
        HEAD=$'\033[1;38;5;195m' ; C1=$'\033[1;38;5;159m' ; C2=$'\033[38;5;123m'
        C3=$'\033[38;5;87m'  ; C4=$'\033[38;5;51m'  ; C5=$'\033[38;5;44m'
        C6=$'\033[38;5;30m'  ; C7=$'\033[38;5;23m'
        LC1=$'\033[38;5;51m' ; LC2=$'\033[38;5;87m' ; LC3=$'\033[38;5;123m' ; LCA=$'\033[38;5;80m'
        SCAN=$'\033[1;38;5;159m' ; FLASH=$'\033[1;38;5;231m'
        ;;
    magenta)
        BG_RGB="1f/0a/1a"  ; FG_RGB="f0/6e/c5"  ; CUR_RGB="ff/3e/b5"
        BG_ANSI="{7967, 2570, 6682}"  ; FG_ANSI="{61680, 28270, 50629}"  ; CUR_ANSI="{65535, 15934, 46517}"
        HEAD=$'\033[1;38;5;231m' ; C1=$'\033[1;38;5;219m' ; C2=$'\033[38;5;213m'
        C3=$'\033[38;5;206m' ; C4=$'\033[38;5;198m' ; C5=$'\033[38;5;162m'
        C6=$'\033[38;5;127m' ; C7=$'\033[38;5;90m'
        LC1=$'\033[38;5;198m' ; LC2=$'\033[38;5;205m' ; LC3=$'\033[38;5;213m' ; LCA=$'\033[38;5;206m'
        SCAN=$'\033[1;38;5;219m' ; FLASH=$'\033[1;38;5;231m'
        ;;
    green)
        BG_RGB="0a/1a/0e"  ; FG_RGB="4e/e6/5c"  ; CUR_RGB="00/ff/41"
        BG_ANSI="{2570, 6682, 3598}"  ; FG_ANSI="{20046, 58982, 23644}"  ; CUR_ANSI="{0, 65535, 16705}"
        HEAD=$'\033[1;38;5;231m' ; C1=$'\033[1;38;5;155m' ; C2=$'\033[38;5;119m'
        C3=$'\033[38;5;82m'  ; C4=$'\033[38;5;46m'  ; C5=$'\033[38;5;34m'
        C6=$'\033[38;5;28m'  ; C7=$'\033[38;5;22m'
        LC1=$'\033[38;5;46m' ; LC2=$'\033[38;5;82m' ; LC3=$'\033[38;5;119m' ; LCA=$'\033[38;5;76m'
        SCAN=$'\033[1;38;5;155m' ; FLASH=$'\033[1;38;5;231m'
        ;;
    blue)
        BG_RGB="0a/0e/1f"  ; FG_RGB="4e/8e/e6"  ; CUR_RGB="3e/7e/ff"
        BG_ANSI="{2570, 3598, 7967}"  ; FG_ANSI="{20046, 36494, 58982}"  ; CUR_ANSI="{15934, 32382, 65535}"
        HEAD=$'\033[1;38;5;231m' ; C1=$'\033[1;38;5;153m' ; C2=$'\033[38;5;111m'
        C3=$'\033[38;5;75m'  ; C4=$'\033[38;5;39m'  ; C5=$'\033[38;5;33m'
        C6=$'\033[38;5;27m'  ; C7=$'\033[38;5;18m'
        LC1=$'\033[38;5;33m' ; LC2=$'\033[38;5;39m' ; LC3=$'\033[38;5;75m' ; LCA=$'\033[38;5;69m'
        SCAN=$'\033[1;38;5;153m' ; FLASH=$'\033[1;38;5;231m'
        ;;
    purple)
        BG_RGB="16/0a/1f"  ; FG_RGB="b4/6e/f0"  ; CUR_RGB="9d/3e/ff"
        BG_ANSI="{5654, 2570, 7967}"  ; FG_ANSI="{46260, 28270, 61680}"  ; CUR_ANSI="{40349, 15934, 65535}"
        HEAD=$'\033[1;38;5;231m' ; C1=$'\033[1;38;5;189m' ; C2=$'\033[38;5;177m'
        C3=$'\033[38;5;141m' ; C4=$'\033[38;5;135m' ; C5=$'\033[38;5;99m'
        C6=$'\033[38;5;91m'  ; C7=$'\033[38;5;54m'
        LC1=$'\033[38;5;135m' ; LC2=$'\033[38;5;141m' ; LC3=$'\033[38;5;177m' ; LCA=$'\033[38;5;147m'
        SCAN=$'\033[1;38;5;189m' ; FLASH=$'\033[1;38;5;231m'
        ;;
    *)
        BG_RGB="14/0e/21"  ; FG_RGB="f2/b3/2a"  ; CUR_RGB="ff/95/00"
        BG_ANSI="{5140, 3598, 8481}"  ; FG_ANSI="{62194, 46003, 10794}"  ; CUR_ANSI="{65535, 38000, 0}"
        HEAD=$'\033[1;38;5;230m' ; C1=$'\033[1;38;5;220m' ; C2=$'\033[38;5;214m'
        C3=$'\033[38;5;208m' ; C4=$'\033[38;5;172m' ; C5=$'\033[38;5;130m'
        C6=$'\033[38;5;94m'  ; C7=$'\033[38;5;58m'
        LC1=$'\033[38;5;208m' ; LC2=$'\033[38;5;214m' ; LC3=$'\033[38;5;220m' ; LCA=$'\033[38;5;214m'
        SCAN=$'\033[1;38;5;230m' ; FLASH=$'\033[1;38;5;231m'
        ;;
esac

DIM=$'\033[38;5;240m' ; RST=$'\033[0m'

printf '\033]11;rgb:%s\033\\' "$BG_RGB"
printf '\033]10;rgb:%s\033\\' "$FG_RGB"
printf '\033]12;rgb:%s\033\\' "$CUR_RGB"
osascript -e "
tell application \"Terminal\"
    tell current settings of selected tab of front window
        set background color to $BG_ANSI
        set normal text color to $FG_ANSI
        set cursor color to $CUR_ANSI
    end tell
end tell
" &>/dev/null &

clear ; tput civis
COLS=$(tput cols) ; ROWS=$(tput lines)
CHARS="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#&*<>{}[]|~"
NCHARS=${#CHARS}

LOGO=(
"      ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗  "
"     ██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝  "
"     ██║     ██║     ███████║██║   ██║██║  ██║█████╗    "
"     ██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝    "
"     ╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗  "
"      ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝  "
"                                                        "
"          ██████╗ ██████╗ ██████╗ ███████╗               "
"         ██╔════╝██╔═══██╗██╔══██╗██╔════╝               "
"         ██║     ██║   ██║██║  ██║█████╗                 "
"         ██║     ██║   ██║██║  ██║██╔══╝                 "
"         ╚██████╗╚██████╔╝██████╔╝███████╗               "
"          ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝               "
)
LCOLORS=("$LC1" "$LCA" "$LCA" "$LC3" "$LC3" "$LC3" "$DIM" "$LC1" "$LCA" "$LCA" "$LC3" "$LC3" "$LC3")
LOGO_ROWS=${#LOGO[@]}
LOGO_WIDTH=58
logo_c0=$(( (COLS - LOGO_WIDTH) / 2 ))
(( logo_c0 < 1 )) && logo_c0=1
logo_r0=$(( (ROWS / 2 - 1) - 6 ))
(( logo_r0 < 2 )) && logo_r0=2

declare -a logo_at
for (( li=0; li<LOGO_ROWS; li++ )); do logo_at[$li]=$(( logo_r0 + li )); done

last_logo_r=${logo_at[$((LOGO_ROWS-1))]}
TAG_ROW=$(( last_logo_r + 2 ))
LOAD_ROW=$(( TAG_ROW + 2 ))
LAUNCH_ROW=$(( LOAD_ROW + 2 ))

TAGLINE="⚡ Opus 4.6 · 1M Context · Claude Max ⚡"
tag_c0=$(( (COLS - ${#TAGLINE}) / 2 ))
(( tag_c0 < 1 )) && tag_c0=1
LOAD_C0=$(( (COLS - 46) / 2 ))
(( LOAD_C0 < 1 )) && LOAD_C0=1
BLOCKS=("░" "▒" "▓" "█")

# Rain init
declare -a dy dspeed dlen
for (( c=0; c<COLS; c++ )); do
    dy[$c]=$(( -(RANDOM % (ROWS + 10)) ))
    dspeed[$c]=$(( (RANDOM % 3) + 1 ))
    dlen[$c]=$(( (RANDOM % 10) + 5 ))
done

# ══════════════════════════════════════════════════════════════════════
# 1. RAIN (1.2s)
# ══════════════════════════════════════════════════════════════════════
for (( f=0; f<30; f++ )); do
    buf=""
    for (( c=0; c<COLS; c+=2 )); do
        y=${dy[$c]}; len=${dlen[$c]}; spd=${dspeed[$c]}
        dy[$c]=$(( y + spd ))
        (( y >= 0 && y < ROWS )) && buf+="\033[$(( y+1 ));$(( c+1 ))H${HEAD}${CHARS:$((RANDOM % NCHARS)):1}"
        (( y-1 >= 0 && y-1 < ROWS )) && buf+="\033[$(( y ));$(( c+1 ))H${C1}${CHARS:$((RANDOM % NCHARS)):1}"
        (( y-2 >= 0 && y-2 < ROWS )) && buf+="\033[$(( y-1 ));$(( c+1 ))H${C2}${CHARS:$((RANDOM % NCHARS)):1}"
        (( y-3 >= 0 && y-3 < ROWS )) && buf+="\033[$(( y-2 ));$(( c+1 ))H${C3}${CHARS:$((RANDOM % NCHARS)):1}"
        for (( t=4; t<=len; t++ )); do
            ty=$(( y - t ))
            (( ty >= 0 && ty < ROWS )) && {
                (( t < len-2 )) && buf+="\033[$(( ty+1 ));$(( c+1 ))H${C5}${CHARS:$((RANDOM % NCHARS)):1}"
                (( t >= len-2 )) && buf+="\033[$(( ty+1 ));$(( c+1 ))H${C6}."
            }
        done
        ey=$(( y - len - 1 ))
        (( ey >= 0 && ey < ROWS )) && buf+="\033[$(( ey+1 ));$(( c+1 ))H "
        if (( y - len > ROWS )); then
            dy[$c]=$(( -(RANDOM % (ROWS/3)) - 1 ))
            dspeed[$c]=$(( (RANDOM % 3) + 1 )) ; dlen[$c]=$(( (RANDOM % 10) + 5 ))
        fi
    done
    printf '%b' "$buf"
    sleep 0.035
done

# ══════════════════════════════════════════════════════════════════════
# 2. SCANLINE LOGO REVEAL + RAIN DRAIN (~1s)
#    Rain drains. Logo lines appear top-to-bottom as rain clears each row.
#    Each revealed row gets its full line cleared first (no remnant pixels).
# ══════════════════════════════════════════════════════════════════════

scan_li=0

for (( f=0; f<26; f++ )); do
    buf=""

    # Rain drain
    for (( c=0; c<COLS; c+=2 )); do
        y=${dy[$c]}; len=${dlen[$c]}
        (( y - len - 2 >= ROWS )) && continue
        dy[$c]=$(( y + 4 ))
        (( y >= 0 && y < ROWS )) && buf+="\033[$(( y+1 ));$(( c+1 ))H${C6}${CHARS:$((RANDOM % NCHARS)):1}"
        for (( e=1; e<=len+2; e++ )); do
            ey=$(( y - e )); (( ey >= 0 && ey < ROWS )) && buf+="\033[$(( ey+1 ));$(( c+1 ))H "
        done
    done

    # Reveal next logo line every 2 frames
    if (( f % 2 == 0 && scan_li < LOGO_ROWS )); then
        r=${logo_at[$scan_li]}
        # Clear the ENTIRE row first (kills any remnant rain pixels)
        buf+="\033[${r};1H\033[2K"
        # Draw logo line bright
        buf+="\033[${r};${logo_c0}H${FLASH}${LOGO[$scan_li]}${RST}"
        scan_li=$(( scan_li + 1 ))
    fi

    # Repaint all previously revealed lines in theme colors (on top of everything)
    for (( li=0; li<scan_li-1; li++ )); do
        r=${logo_at[$li]}
        buf+="\033[${r};${logo_c0}H${LCOLORS[$li]}${LOGO[$li]}${RST}"
    done

    printf '%b' "$buf"
    sleep 0.035
done

# Final settle: clear entire screen, repaint full logo clean
buf=""
for (( r=1; r<=ROWS; r++ )); do buf+="\033[${r};1H\033[2K"; done
for (( li=0; li<LOGO_ROWS; li++ )); do
    r=${logo_at[$li]}
    buf+="\033[${r};${logo_c0}H${LCOLORS[$li]}${LOGO[$li]}${RST}"
done
printf '%b' "$buf"

# ══════════════════════════════════════════════════════════════════════
# 3. TAGLINE + LOADING BAR + LAUNCHING
# ══════════════════════════════════════════════════════════════════════

sleep 0.2

# Tagline types out first
printf '\033[%d;%dH' "$TAG_ROW" "$tag_c0"
for (( i=0; i<${#TAGLINE}; i++ )); do
    printf '%b%s%b' "$LCA" "${TAGLINE:$i:1}" "$RST"
    sleep 0.008
done
sleep 0.1

# Loading bar — slow and deliberate with fast-slow-fast pacing
printf '\033[%d;%dH%b%s' "$LOAD_ROW" "$LOAD_C0" "$DIM" "Initializing "
for (( load_i=0; load_i<30; load_i++ )); do
    idx=$(( (load_i / 8) % 4 ))
    printf '\033[%d;%dH%b%s%b' "$LOAD_ROW" "$(( LOAD_C0 + 14 + load_i ))" "$LC1" "${BLOCKS[$idx]}" "$RST"
    # Fast start, slow middle, fast end
    if (( load_i < 6 )); then
        sleep 0.02
    elif (( load_i < 24 )); then
        sleep 0.06
    else
        sleep 0.02
    fi
done
printf '\033[%d;%dH %bReady%b' "$LOAD_ROW" "$(( LOAD_C0 + 44 ))" "$LC3" "$RST"
sleep 0.15

LAUNCH_TEXT="Launching Claude..."
launch_c0=$(( (COLS - ${#LAUNCH_TEXT}) / 2 ))
printf '\033[%d;%dH\033[1;37m%s%b' "$LAUNCH_ROW" "$launch_c0" "$LAUNCH_TEXT" "$RST"

# Brief hold — bar just filled, everything looks ready
sleep 0.4

# ══════════════════════════════════════════════════════════════════════
# 5. GLITCH OUT (3s) — slow flashes → faster → frantic → terminator
#    Random logo lines flash white or blank out. Intensity builds.
# ══════════════════════════════════════════════════════════════════════

# Helper: repaint full logo + text clean
repaint_all() {
    local b=""
    for (( li=0; li<LOGO_ROWS; li++ )); do
        r=${logo_at[$li]}
        b+="\033[${r};${logo_c0}H${LCOLORS[$li]}${LOGO[$li]}${RST}"
    done
    b+="\033[${TAG_ROW};${tag_c0}H${LCA}${TAGLINE}${RST}"
    printf '%b' "$b"
}

# All rows that could be glitched (logo + text rows)
ALL_ROWS=()
for (( li=0; li<LOGO_ROWS; li++ )); do ALL_ROWS+=(${logo_at[$li]}); done
ALL_ROWS+=($TAG_ROW $LOAD_ROW $LAUNCH_ROW)
NUM_ROWS=${#ALL_ROWS[@]}

for (( f=0; f<35; f++ )); do
    # Quick ramp to chaos
    if (( f < 4 )); then
        (( f % 2 != 0 )) && { sleep 0.035; continue; }
        num_glitch=2
    elif (( f < 10 )); then
        num_glitch=$(( 3 + RANDOM % 3 ))
    elif (( f < 20 )); then
        num_glitch=$(( 6 + RANDOM % 4 ))
    else
        # Total chaos
        num_glitch=$(( 8 + RANDOM % 5 ))
    fi

    buf=""

    # Glitch effects — multiple types for variety
    for (( g=0; g<num_glitch; g++ )); do
        ri=$(( RANDOM % NUM_ROWS ))
        row=${ALL_ROWS[$ri]}
        action=$(( RANDOM % 7 ))

        if (( action == 0 )); then
            # Blank the row completely
            buf+="\033[${row};1H\033[2K"
        elif (( action == 1 )); then
            # Flash white
            if (( ri < LOGO_ROWS )); then
                buf+="\033[${row};${logo_c0}H${FLASH}${LOGO[$ri]}${RST}"
            fi
        elif (( action == 2 )); then
            # Scan color (shifted hue)
            if (( ri < LOGO_ROWS )); then
                buf+="\033[${row};${logo_c0}H${SCAN}${LOGO[$ri]}${RST}"
            fi
        elif (( action == 3 )); then
            # Horizontal offset glitch — shift the line a few chars right
            if (( ri < LOGO_ROWS )); then
                shift=$(( RANDOM % 6 + 1 ))
                buf+="\033[${row};1H\033[2K"
                buf+="\033[${row};$(( logo_c0 + shift ))H${LCOLORS[$ri]}${LOGO[$ri]}${RST}"
            fi
        elif (( action == 4 )); then
            # Horizontal offset glitch — shift left
            if (( ri < LOGO_ROWS )); then
                shift=$(( RANDOM % 4 + 1 ))
                nc=$(( logo_c0 - shift ))
                (( nc < 1 )) && nc=1
                buf+="\033[${row};1H\033[2K"
                buf+="\033[${row};${nc}H${LCOLORS[$ri]}${LOGO[$ri]}${RST}"
            fi
        elif (( action == 5 )); then
            # Dim flicker
            if (( ri < LOGO_ROWS )); then
                buf+="\033[${row};${logo_c0}H${DIM}${LOGO[$ri]}${RST}"
            fi
        else
            # Partial blank — blank left or right half of a logo row
            if (( ri < LOGO_ROWS )); then
                if (( RANDOM % 2 )); then
                    # blank left half
                    buf+="\033[${row};1H\033[2K"
                    buf+="\033[${row};$(( logo_c0 + LOGO_WIDTH/2 ))H${LCOLORS[$ri]}${LOGO[$ri]:$((LOGO_WIDTH/2))}${RST}"
                else
                    # blank right half — just clear from midpoint
                    mid=$(( logo_c0 + LOGO_WIDTH / 2 ))
                    buf+="\033[${row};${mid}H\033[K"
                fi
            fi
        fi
    done

    # In frantic phase, randomly flash entire screen white for 1-frame bursts
    if (( f >= 15 && RANDOM % 4 == 0 )); then
        for (( li=0; li<LOGO_ROWS; li++ )); do
            r=${logo_at[$li]}
            buf+="\033[${r};${logo_c0}H${FLASH}${LOGO[$li]}${RST}"
        done
    fi

    printf '%b' "$buf"
    sleep 0.035

    # Restore on non-frantic frames
    if (( f < 10 )); then
        sleep 0.02
        repaint_all
    fi
done

# Glitch to black — lines vanish in random bursts
remaining=()
for (( i=0; i<NUM_ROWS; i++ )); do remaining+=($i); done
while (( ${#remaining[@]} > 0 )); do
    # Kill 2-4 random rows per frame
    kill_count=$(( 2 + RANDOM % 3 ))
    (( kill_count > ${#remaining[@]} )) && kill_count=${#remaining[@]}
    buf=""
    for (( k=0; k<kill_count; k++ )); do
        pick=$(( RANDOM % ${#remaining[@]} ))
        ri=${remaining[$pick]}
        row=${ALL_ROWS[$ri]}
        buf+="\033[${row};1H\033[2K"
        # Remove from remaining
        remaining=("${remaining[@]:0:$pick}" "${remaining[@]:$((pick+1))}")
    done
    printf '%b' "$buf"
    sleep 0.03
done
sleep 0.1

# ══════════════════════════════════════════════════════════════════════
# 6. CRT TERMINATOR SHUTDOWN
# ══════════════════════════════════════════════════════════════════════

# Vertical collapse
half=$(( ROWS / 2 ))
for (( offset=0; offset<=half; offset++ )); do
    top=$(( offset + 1 )) ; bot=$(( ROWS - offset ))
    printf '\033[%d;1H\033[2K' "$top"
    (( bot != top )) && printf '\033[%d;1H\033[2K' "$bot"
    sleep 0.01
done

# Scan line
center_r=$(( half + 1 ))
printf '\033[%d;1H%b' "$center_r" "$SCAN"
for (( s=0; s<COLS; s++ )); do printf '─'; done
printf '%b' "$RST"
sleep 0.08

# Shrink
for (( margin=0; margin<=COLS/2; margin+=4 )); do
    printf '\033[%d;1H\033[2K' "$center_r"
    left=$(( margin + 1 )) ; right=$(( COLS - margin ))
    if (( right > left )); then
        printf '\033[%d;%dH%b' "$center_r" "$left" "$SCAN"
        for (( x=left; x<=right; x++ )); do printf '─'; done
        printf '%b' "$RST"
    fi
    sleep 0.015
done

# Dot
printf '\033[%d;1H\033[2K' "$center_r"
printf '\033[%d;%dH%b·%b' "$center_r" "$(( COLS/2 ))" "$FLASH" "$RST"
sleep 0.08
printf '\033[%d;1H\033[2K' "$center_r"
sleep 0.12

tput cnorm ; clear
exec %%CLAUDE_PATH%%
ENDOFCLAUDELAUNCH

# Replace the placeholder with the detected claude path
sed -i '' "s|%%CLAUDE_PATH%%|${CLAUDE_BIN}|g" "$INSTALL_DIR/claudelaunch"

echo -e "  ${GREEN}Wrote${RST} claudelaunch"

# ── Write claudemode ──────────────────────────────────────────────────
cat > "$INSTALL_DIR/claudemode" << 'ENDOFCLAUDEMODE'
#!/bin/bash
# claudemode — opens 4 Terminal windows running Claude Code, one in each screen quadrant
# Each window gets a different color theme launch animation

THEMES=("orange" "cyan" "magenta" "green")

osascript - "${THEMES[@]}" <<'APPLESCRIPT'
on run argv
    set themes to argv

    tell application "Terminal"
        activate
        delay 0.3

        tell application "Finder"
            set screenBounds to bounds of window of desktop
            set screenWidth to item 3 of screenBounds
            set screenHeight to item 4 of screenBounds
        end tell

        set menuBar to 25
        set dockWidth to 40
        set pad to 8
        set gap to 8

        set areaX to dockWidth + pad
        set areaY to menuBar + pad
        set areaW to screenWidth - areaX - pad
        set areaH to screenHeight - areaY - pad

        set winW to (areaW - gap) / 2
        set winH to (areaH - gap) / 2

        set positions to {¬
            {areaX, areaY, areaX + winW, areaY + winH}, ¬
            {areaX + winW + gap, areaY, areaX + winW + gap + winW, areaY + winH}, ¬
            {areaX, areaY + winH + gap, areaX + winW, areaY + winH + gap + winH}, ¬
            {areaX + winW + gap, areaY + winH + gap, areaX + winW + gap + winW, areaY + winH + gap + winH}}

        repeat with i from 1 to 4
            set themeColor to item i of themes
            do script "claudelaunch " & themeColor
            set bounds of front window to item i of positions
        end repeat
    end tell
end run
APPLESCRIPT
ENDOFCLAUDEMODE

echo -e "  ${GREEN}Wrote${RST} claudemode"

# ── Write claudewall ──────────────────────────────────────────────────
cat > "$INSTALL_DIR/claudewall" << 'ENDOFCLAUDEWALL'
#!/bin/bash
# claudewall — opens 6 Terminal windows running Claude Code in a 3x2 grid
# Each window gets a different color theme launch animation

THEMES=("orange" "cyan" "magenta" "green" "blue" "purple")

osascript - "${THEMES[@]}" <<'APPLESCRIPT'
on run argv
    set themes to argv

    tell application "Terminal"
        activate
        delay 0.3

        tell application "Finder"
            set screenBounds to bounds of window of desktop
            set screenWidth to item 3 of screenBounds
            set screenHeight to item 4 of screenBounds
        end tell

        set menuBar to 25
        set dockWidth to 40
        set pad to 8
        set gap to 8

        set areaX to dockWidth + pad
        set areaY to menuBar + pad
        set areaW to screenWidth - areaX - pad
        set areaH to screenHeight - areaY - pad

        set cols to 3
        set rows to 2
        set winW to (areaW - (gap * (cols - 1))) / cols
        set winH to (areaH - (gap * (rows - 1))) / rows

        set idx to 1
        repeat with row from 0 to (rows - 1)
            repeat with col from 0 to (cols - 1)
                set x1 to areaX + (col * (winW + gap))
                set y1 to areaY + (row * (winH + gap))
                set x2 to x1 + winW
                set y2 to y1 + winH

                set themeColor to item idx of themes
                do script "claudelaunch " & themeColor
                set bounds of front window to {x1, y1, x2, y2}
                set idx to idx + 1
            end repeat
        end repeat
    end tell
end run
APPLESCRIPT
ENDOFCLAUDEWALL

echo -e "  ${GREEN}Wrote${RST} claudewall"

# ── Write claudeglow ──────────────────────────────────────────────────
cat > "$INSTALL_DIR/claudeglow" << 'ENDOFCLAUDEGLOW'
#!/bin/bash
# claudeglow — Activates a neon cyberpunk color theme in Terminal
# Uses OSC escape sequences (works reliably across Terminal.app versions)
# Run 'claudeglow reset' to restore defaults

if [[ "$1" == "reset" ]]; then
    # Reset to Terminal's default colors
    printf '\033]110\033\\'   # reset foreground
    printf '\033]111\033\\'   # reset background
    printf '\033]112\033\\'   # reset cursor
    echo -e "\033[38;5;240mTheme reset to defaults.\033[0m"
    exit 0
fi

# Apply to current window via OSC sequences
# Background: deep dark with purple tint (#140e21)
printf '\033]11;rgb:14/0e/21\033\\'

# Foreground text: warm amber (#f2b32a)
printf '\033]10;rgb:f2/b3/2a\033\\'

# Cursor: bright orange (#ff9500)
printf '\033]12;rgb:ff/95/00\033\\'

# Bold text: gold
printf '\033]5;0;rgb:ff/d7/4e\033\\'

# Now apply to ALL open Terminal windows via AppleScript
osascript <<'EOF' 2>/dev/null
tell application "Terminal"
    repeat with w in every window
        repeat with t in every tab of w
            tell current settings of t
                set background color to {5140, 3598, 8481}
                set normal text color to {62194, 46003, 10794}
                set cursor color to {65535, 38000, 0}
                set bold text color to {65535, 55000, 20000}
                set selection color to {20000, 12000, 8000}
            end tell
        end repeat
    end repeat
end tell
EOF

echo ""
echo -e "\033[1;38;5;208m⚡ Claude Glow activated ⚡\033[0m"
echo ""
echo -e "\033[38;5;214m  Background:  \033[48;5;53m  deep purple  \033[0m"
echo -e "\033[38;5;214m  Text:        \033[38;5;214m  warm amber   \033[0m"
echo -e "\033[38;5;214m  Cursor:      \033[38;5;208m  bright orange\033[0m"
echo ""
echo -e "\033[38;5;240m  Run 'claudeglow reset' to restore defaults\033[0m"
ENDOFCLAUDEGLOW

echo -e "  ${GREEN}Wrote${RST} claudeglow"

# ── Write clauderain ──────────────────────────────────────────────────
cat > "$INSTALL_DIR/clauderain" << 'ENDOFCLAUDERAIN'
#!/bin/bash
# clauderain — Dense Matrix-style falling rain with Claude/AI theme
# Press Ctrl+C to exit

cleanup() {
    printf '\033[0m'
    tput cnorm
    tput rmcup
    exit 0
}
trap cleanup INT TERM

tput smcup
tput civis

COLS=$(tput cols)
ROWS=$(tput lines)

# Character pool
CHARS="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#&*<>{}[]|~ΣΩπλμδφψαβγ═║╗╔╚╝░▒▓█"

# Color escape codes (head → tail fade)
HEAD=$'\033[1;38;5;230m'     # bright white-gold (glowing head)
C1=$'\033[1;38;5;220m'       # bright gold
C2=$'\033[38;5;214m'         # amber
C3=$'\033[38;5;208m'         # orange
C4=$'\033[38;5;172m'         # dark orange
C5=$'\033[38;5;130m'         # brown-orange
C6=$'\033[38;5;94m'          # dark brown
C7=$'\033[38;5;58m'          # very dark
C8=$'\033[38;5;236m'         # nearly black
SP=' '

# State arrays — every column can have a drop
declare -a dy dspeed dlen dactive dwait

# Initialize columns (every column, staggered start)
for (( c=0; c<COLS; c++ )); do
    dy[$c]=$(( -(RANDOM % (ROWS + 20)) ))
    dspeed[$c]=$(( (RANDOM % 3) + 1 ))
    dlen[$c]=$(( (RANDOM % 12) + 6 ))
    dactive[$c]=1
    dwait[$c]=0
done

# Pre-generate random chars function (avoid repeated RANDOM in hot loop)
rand_char() {
    printf '%s' "${CHARS:$((RANDOM % ${#CHARS})):1}"
}

while true; do
    buf=""

    for (( c=0; c<COLS; c++ )); do
        # Skip some columns for visual variety (not every single col)
        (( c % 2 == 0 && RANDOM % 10 < 3 )) && continue

        y=${dy[$c]}
        len=${dlen[$c]}
        speed=${dspeed[$c]}

        # Advance
        dy[$c]=$(( y + speed ))

        ch="${CHARS:$((RANDOM % ${#CHARS})):1}"

        # Head — bright glowing character
        if (( y >= 0 && y < ROWS )); then
            buf+="\033[$(( y + 1 ));$(( c + 1 ))H${HEAD}${ch}"
        fi

        # Body gradient — fade from bright to dim
        if (( y-1 >= 0 && y-1 < ROWS )); then
            buf+="\033[$(( y ));$(( c + 1 ))H${C1}${CHARS:$((RANDOM % ${#CHARS})):1}"
        fi
        if (( y-2 >= 0 && y-2 < ROWS )); then
            buf+="\033[$(( y - 1 ));$(( c + 1 ))H${C2}${CHARS:$((RANDOM % ${#CHARS})):1}"
        fi
        if (( y-3 >= 0 && y-3 < ROWS )); then
            buf+="\033[$(( y - 2 ));$(( c + 1 ))H${C3}${CHARS:$((RANDOM % ${#CHARS})):1}"
        fi
        if (( y-4 >= 0 && y-4 < ROWS )); then
            buf+="\033[$(( y - 3 ));$(( c + 1 ))H${C4}${CHARS:$((RANDOM % ${#CHARS})):1}"
        fi

        # Tail — progressively dimmer
        for (( t=5; t<=len; t++ )); do
            ty=$(( y - t ))
            if (( ty >= 0 && ty < ROWS )); then
                if (( t < len/2 )); then
                    buf+="\033[$(( ty + 1 ));$(( c + 1 ))H${C5}${CHARS:$((RANDOM % ${#CHARS})):1}"
                elif (( t < len - 2 )); then
                    buf+="\033[$(( ty + 1 ));$(( c + 1 ))H${C6}·"
                elif (( t < len )); then
                    buf+="\033[$(( ty + 1 ));$(( c + 1 ))H${C7}."
                fi
            fi
        done

        # Erase — clear characters after tail passes
        for (( e=0; e<speed+1; e++ )); do
            ey=$(( y - len - e ))
            if (( ey >= 0 && ey < ROWS )); then
                buf+="\033[$(( ey + 1 ));$(( c + 1 ))H "
            fi
        done

        # Reset drop when fully off screen
        if (( y - len - 2 > ROWS )); then
            dy[$c]=$(( -(RANDOM % (ROWS / 2 + 10)) - 1 ))
            dspeed[$c]=$(( (RANDOM % 3) + 1 ))
            dlen[$c]=$(( (RANDOM % 12) + 6 ))
        fi
    done

    # Flush entire frame at once
    printf '%b' "$buf"

    sleep 0.04
done
ENDOFCLAUDERAIN

echo -e "  ${GREEN}Wrote${RST} clauderain"

# ── Write terminate ───────────────────────────────────────────────────
cat > "$INSTALL_DIR/terminate" << 'ENDOFTERMINATE'
#!/bin/bash
# terminate — closes the current Terminal window
osascript -e 'tell application "Terminal" to close front window' &>/dev/null
ENDOFTERMINATE

echo -e "  ${GREEN}Wrote${RST} terminate"

# ── Write terminateall ────────────────────────────────────────────────
cat > "$INSTALL_DIR/terminateall" << 'ENDOFTERMINATEALL'
#!/bin/bash
# terminateall — closes all Terminal windows
osascript -e 'tell application "Terminal" to close every window' &>/dev/null
ENDOFTERMINATEALL

echo -e "  ${GREEN}Wrote${RST} terminateall"

# ── Write mycommands ──────────────────────────────────────────────────
cat > "$INSTALL_DIR/mycommands" << 'ENDOFMYCOMMANDS'
#!/bin/bash
# mycommands — Shows all custom terminal commands

ORANGE='\033[38;5;208m'
AMBER='\033[38;5;214m'
GOLD='\033[38;5;220m'
DIM='\033[38;5;240m'
WHITE='\033[1;37m'
BOLD='\033[1m'
RST='\033[0m'

echo ""
echo -e "${ORANGE}${BOLD}  ═══════════════════════════════════════════${RST}"
echo -e "${GOLD}${BOLD}          ⚡ My Custom Commands ⚡${RST}"
echo -e "${ORANGE}${BOLD}  ═══════════════════════════════════════════${RST}"
echo ""
echo -e "${WHITE}${BOLD}  LAUNCHERS${RST}"
echo -e "  ${AMBER}claude${RST}          ${DIM}Launch Claude with cinematic orange boot animation${RST}"
echo -e "  ${AMBER}claudelaunch${RST}    ${DIM}Boot animation with color theme ${WHITE}[orange|cyan|magenta|green|blue|purple]${RST}"
echo -e "  ${AMBER}claudemode${RST}      ${DIM}4 Claude windows in quadrants (orange, cyan, magenta, green)${RST}"
echo -e "  ${AMBER}claudewall${RST}      ${DIM}6 Claude windows in 3x2 grid (all 6 color themes)${RST}"
echo ""
echo -e "${WHITE}${BOLD}  VISUALS${RST}"
echo -e "  ${AMBER}clauderain${RST}      ${DIM}Matrix-style falling rain in Claude amber/orange theme${RST}"
echo -e "  ${AMBER}claudeglow${RST}      ${DIM}Neon cyberpunk terminal color theme ${WHITE}[reset]${RST}"
echo ""
echo -e "${WHITE}${BOLD}  WINDOW MANAGEMENT${RST}"
echo -e "  ${AMBER}terminate${RST}       ${DIM}Close the current Terminal window${RST}"
echo -e "  ${AMBER}terminateall${RST}    ${DIM}Close all Terminal windows${RST}"
echo ""
echo -e "${WHITE}${BOLD}  REFERENCE${RST}"
echo -e "  ${AMBER}mycommands${RST}      ${DIM}Show this list${RST}"
echo ""
echo -e "${ORANGE}${BOLD}  ═══════════════════════════════════════════${RST}"
echo -e "  ${DIM}Commands live in ~/.local/bin/${RST}"
echo ""
ENDOFMYCOMMANDS

echo -e "  ${GREEN}Wrote${RST} mycommands"

# ── Make all executable ───────────────────────────────────────────────
chmod +x "$INSTALL_DIR/claudelaunch"
chmod +x "$INSTALL_DIR/claudemode"
chmod +x "$INSTALL_DIR/claudewall"
chmod +x "$INSTALL_DIR/claudeglow"
chmod +x "$INSTALL_DIR/clauderain"
chmod +x "$INSTALL_DIR/terminate"
chmod +x "$INSTALL_DIR/terminateall"
chmod +x "$INSTALL_DIR/mycommands"
echo ""
echo -e "  ${GREEN}All files chmod +x${RST}"

# ── Add ~/.local/bin to PATH in shell rc ──────────────────────────────
SHELL_RC=""
if [[ -f "$HOME/.zshrc" ]]; then
    SHELL_RC="$HOME/.zshrc"
elif [[ -f "$HOME/.bashrc" ]]; then
    SHELL_RC="$HOME/.bashrc"
elif [[ "$SHELL" == *"zsh"* ]]; then
    SHELL_RC="$HOME/.zshrc"
else
    SHELL_RC="$HOME/.bashrc"
fi

echo ""
echo -e "  ${DIM}Shell config: ${WHITE}${SHELL_RC}${RST}"

# Add PATH entry if not already present
if ! grep -q '\.local/bin' "$SHELL_RC" 2>/dev/null; then
    echo '' >> "$SHELL_RC"
    echo '# Added by claude-commands-installer' >> "$SHELL_RC"
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$SHELL_RC"
    echo -e "  ${GREEN}Added${RST} ~/.local/bin to PATH in ${SHELL_RC}"
else
    echo -e "  ${DIM}PATH already includes ~/.local/bin${RST}"
fi

# Add claude() wrapper function if not already present
if ! grep -q 'claude()' "$SHELL_RC" 2>/dev/null; then
    cat >> "$SHELL_RC" << ENDOFWRAPPER

# Claude wrapper — no args launches with animation, otherwise passes through
claude() {
    if [[ \$# -eq 0 ]]; then
        claudelaunch
    else
        ${CLAUDE_BIN} "\$@"
    fi
}
ENDOFWRAPPER
    echo -e "  ${GREEN}Added${RST} claude() wrapper function to ${SHELL_RC}"
else
    echo -e "  ${DIM}claude() wrapper already exists in ${SHELL_RC}${RST}"
fi

# ── Summary ───────────────────────────────────────────────────────────
echo ""
echo -e "${ORANGE}${BOLD}  ═══════════════════════════════════════════════════════${RST}"
echo -e "${GOLD}${BOLD}     Installation Complete!${RST}"
echo -e "${ORANGE}${BOLD}  ═══════════════════════════════════════════════════════${RST}"
echo ""
echo -e "  ${WHITE}${BOLD}Installed commands:${RST}"
echo -e "    ${AMBER}claudelaunch${RST}    Cinematic boot animation → Claude"
echo -e "    ${AMBER}claudemode${RST}      4 Claude windows in quadrants"
echo -e "    ${AMBER}claudewall${RST}      6 Claude windows in 3x2 grid"
echo -e "    ${AMBER}claudeglow${RST}      Neon cyberpunk terminal theme"
echo -e "    ${AMBER}clauderain${RST}      Matrix-style falling rain"
echo -e "    ${AMBER}terminate${RST}       Close current Terminal window"
echo -e "    ${AMBER}terminateall${RST}    Close all Terminal windows"
echo -e "    ${AMBER}mycommands${RST}      Show command reference"
echo ""
echo -e "  ${WHITE}${BOLD}Shell wrapper:${RST}"
echo -e "    ${AMBER}claude${RST}          Launches with animation (no args) or passes through"
echo ""
echo -e "  ${WHITE}${BOLD}Claude binary:${RST} ${CLAUDE_BIN}"
echo ""
echo -e "  ${DIM}To activate now, run:${RST}"
echo -e "    ${WHITE}source ${SHELL_RC}${RST}"
echo ""
