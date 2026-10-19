# ttyreel tutorial

New to the terminal? Run `ttyreel wizard`: it asks, shows the command, runs it.

Recipes for real work. All commands write files next to where you run them; `-o name` sets the name (the extension is added).

## 1. A command in your README

```bash
ttyreel render "git log --oneline -5" -o docs/log --format svg
```
```markdown
![git log](docs/log.svg)
```
`--markdown` prints that image line for you.

## 2. A screencast-style demo (typed command)

```bash
ttyreel render "npm test" --type --animated -o docs/test
```
`--prompt starship` (or `zsh`, `bash`, `none`, or your own text) changes the prompt, `--type-speed 30` types faster, `--speed 2` plays the output twice as fast, `--no-loop` plays once.

## 3. A multi-step demo from a script

```yaml
# docs/demo.yml
title: Install and run
theme: nord
prompt: starship
steps:
  - cmd: npm install
    pause: 800
  - cmd: npm start
    show: my-app start        # typed instead of the real command
```
```bash
ttyreel play docs/demo.yml --animated --format svg,gif
```
A step with `type: false` shows no prompt and no typing. Flags override the file.

## 4. Convert an asciinema recording

```bash
asciinema rec session.cast
ttyreel cast session.cast --format gif --idle-limit 1.5
```

## 5. Light and dark pages

```bash
ttyreel render "ls -la" --theme github-dark --light-theme github-light --animated -o docs/ls
```
The SVG follows the viewer's colour scheme (GitHub does).

## 6. Keep secrets out of the picture

Tokens, keys, `password=` values and private keys are masked automatically (also in the window title, which is the command line). Add your own patterns or turn it off:

```bash
ttyreel render "cat deploy.log" --redact "prod-[a-z0-9]+" --redact "10\.0\.\d+\.\d+"
ttyreel render "echo hello" --no-redact
```
It is a safety net: always look at the result before you publish it.

## 7. Sharp images and part of the screen

```bash
ttyreel render "npm test" --format png --scale 2     # retina-sharp PNG
ttyreel render "npm test" --lines 5-12                # only rows 5 to 12
ttyreel render "make" --no-window --padding 0         # just the terminal, no frame
```

## 8. Your own look

```bash
ttyreel render "ls" --theme-file mine.json --font "JetBrains Mono" --font-size 16
```
See the README for the theme file format.

## 9. Live preview while you work

```bash
ttyreel serve "npm test" --watch src
```
Opens a page on `127.0.0.1` that records again and reloads whenever a file in `src` changes.

## 10. Keep README demos current in CI

```yaml
- uses: aeon022/ttyreel@main
  with:
    script: docs/demo.yml
    output: docs/demo
    args: --animated --light-theme github-light
```
Commit the result in a later step (for example with `stefanzweifel/git-auto-commit-action`).
