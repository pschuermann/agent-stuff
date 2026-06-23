# wt — browse this repo's git worktrees (whichever tool made them) and cd into one.
#
# `git worktree list` already enumerates every worktree registered to the repo's
# common git-dir, regardless of who created it — Claude Code (.claude/worktrees/),
# Pi (~/.pi/review-worktrees/), Copilot (copilot-cli-managed-worktrees), the
# superpowers fallback (.worktrees/), or a hand-made sibling. So discovery is
# tool-agnostic; the path only tells us which tag to show.
#
# Defined as a shell function (not a script) so the `cd` lands in *your* shell.
wt() {
  command -v fzf >/dev/null 2>&1 || { print -u2 "wt: fzf not found"; return 1; }
  git rev-parse --git-dir >/dev/null 2>&1 || { print -u2 "wt: not in a git repo"; return 1; }

  local lines
  lines=$(git worktree list --porcelain | awk '
    function classify(p) {
      if (p ~ /\/\.claude\/worktrees\//)         return "claude"
      if (p ~ /\/\.pi\//)                         return "pi"
      if (p ~ /copilot-cli-managed-worktrees/)    return "copilot"
      return "manual"
    }
    function emit(  n, parts, name, tool) {
      if (path == "") return
      n = split(path, parts, "/"); name = parts[n]
      tool = (count == 1) ? "main" : classify(path)
      if (br == "") br = det ? "(detached)" : "?"
      printf "%-8s %-26s %-9s %s\t%s\n", tool, name, sha, br, path
    }
    /^worktree /  { emit(); path = substr($0, 10); sha = ""; br = ""; det = 0; count++ }
    /^HEAD /      { sha = substr($0, 6, 8) }
    /^branch /    { br = $2; sub(/^refs\/heads\//, "", br) }
    /^detached$/  { det = 1 }
    /^bare$/      { br = "(bare)" }
    END           { emit() }
  ')

  [ -z "$lines" ] && { print -u2 "wt: no worktrees"; return 1; }

  # Preview is hidden by default (toggle with ctrl-o) so the list gets the full
  # width and stays readable in a split pane. When shown, sit it below on narrow
  # terminals and to the right on wide ones.
  local cols=${COLUMNS:-$(tput cols 2>/dev/null || echo 80)}
  local pw='hidden,right,55%,border-left'
  [ "$cols" -lt 120 ] && pw='hidden,down,55%,border-top'

  local sel
  sel=$(printf '%s\n' "$lines" | fzf \
    --delimiter='\t' --with-nth=1 \
    --height='~80%' --layout=reverse --info=inline --cycle \
    --header='ctrl-o: preview   ·   tool / name / sha / branch' \
    --preview='git -C {2} -c color.ui=always log --oneline -8 2>/dev/null; echo; git -C {2} -c color.ui=always status -sb 2>/dev/null | head -20' \
    --preview-window="$pw" \
    --bind='ctrl-o:toggle-preview') || return

  local dir=${sel##*$'\t'}
  [ -n "$dir" ] && cd "$dir"
}
