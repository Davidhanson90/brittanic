# Getting started with Brittanic

This guide is for people who are new to coding tools. It walks you through everything you need to run this project on your computer, and also how to work on it with AI coding assistants (agents).

## What is this project?

**Brittanic** is an interactive 3D store scene you can explore in a web browser. It is built with **Angular** (a tool for making websites) and **Three.js** (a tool for 3D graphics). Characters in the store can play video clips when you interact with them.

You do **not** need to understand those tools to try the project. Follow the steps below and you will be fine.

---

## What you need before you start

- A computer (Windows, Mac, or Linux)
- An internet connection
- A web browser (Chrome, Edge, Firefox, or Safari)
- About 30–60 minutes the first time (mostly waiting for downloads)

You will install two free programs:

1. **Git** — lets you copy (clone) this project from GitHub onto your computer
2. **Node.js** — includes **npm**, which installs the project’s other pieces and runs it

---

## Step 1: Install Git

Git is a program that downloads and tracks project files. You only need it so you can copy this project.

### Windows

1. Open your browser and go to the official download page: [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. Download the installer and run it.
3. Click **Next** through the options (the defaults are fine for beginners).
4. When it finishes, open **Command Prompt** or **PowerShell** (search for them in the Start menu).

Check that Git works by typing this and pressing Enter:

```bash
git --version
```

You should see a version number (for example `git version 2.47.0`).

### Mac

**Option A — simplest for many people:** install Apple’s Command Line Tools (includes Git):

1. Open **Terminal** (from Applications → Utilities, or search with Spotlight).
2. Type this and press Enter:

```bash
xcode-select --install
```

3. Follow the on-screen prompts.

**Option B — if you use Homebrew** (a package manager some people already have):

```bash
brew install git
```

Official Git downloads for Mac: [https://git-scm.com/download/mac](https://git-scm.com/download/mac)

Then check:

```bash
git --version
```

### Linux

On Ubuntu or Debian, open a terminal and run:

```bash
sudo apt update
sudo apt install git
```

On Fedora:

```bash
sudo dnf install git
```

Official downloads and other distros: [https://git-scm.com/download/linux](https://git-scm.com/download/linux)

Then check:

```bash
git --version
```

---

## Step 2: Install Node.js (includes npm)

**Node.js** is a program that runs JavaScript outside the browser. This project needs it. When you install Node.js, you also get **npm** (Node Package Manager), which downloads the project’s libraries.

This project’s automated build uses **Node.js version 24**. Use **Node 24** if you can, or the current **LTS** (Long-Term Support — the version Node recommends for most people) from the official site as long as it is a recent major version.

### Recommended: official installer (all platforms)

1. Go to [https://nodejs.org/](https://nodejs.org/)
2. Download the **LTS** installer for your system (Windows, macOS, or Linux). Prefer **version 24** if it is offered; otherwise the current LTS is fine for getting started.
3. Run the installer and accept the defaults.
4. **Close and reopen** your terminal (Command Prompt, PowerShell, or Terminal) so it picks up the new programs.

### Check that Node and npm work

In a new terminal window, run:

```bash
node -v
```

```bash
npm -v
```

You should see version numbers for both (for example `v24.x.x` and `10.x.x`).

If either command says it is not found, close the terminal completely, open a new one, and try again. If it still fails, reinstall Node from [nodejs.org](https://nodejs.org/) and restart your computer once.

### Optional: nvm (Node Version Manager)

Some developers use **nvm** to switch between Node versions. You do **not** need this to run Brittanic. If you already use nvm, install Node 24 with it (for example `nvm install 24` then `nvm use 24`). Beginners should stick to the official installer above.

---

## Step 3: Create a GitHub account (if you need one)

You need a free [GitHub](https://github.com/) account to clone (copy) this project easily and to contribute later.

1. Go to [https://github.com/join](https://github.com/join)
2. Sign up and verify your email if asked

You can browse the live site without an account — see [Try the live site](#optional-try-the-live-site-no-install) below.

---

## Step 4: Copy (clone) this project

1. Open a terminal (Command Prompt, PowerShell, or Terminal).
2. Go to a folder where you want the project (for example your home folder or Documents). On Windows you might do:

```bash
cd Documents
```

On Mac or Linux:

```bash
cd ~
```

3. Clone the project with HTTPS (easiest for beginners):

```bash
git clone https://github.com/Davidhanson90/brittanic.git
```

4. Enter the project folder:

```bash
cd brittanic
```

You now have a local copy of the project files.

---

## Step 5: Install project dependencies

Still inside the `brittanic` folder, run:

```bash
npm install
```

This downloads everything listed in `package.json` into a folder called `node_modules`. The first run can take a few minutes. Wait until it finishes without errors.

---

## Step 6: Start the project

Run:

```bash
npm start
```

(This is the same as `ng serve` — Angular’s local development server.)

When it is ready, open your browser and go to:

**http://localhost:4200/**

You should see the Brittanic store scene. If you change files later, the page often updates on its own.

### How to stop the server

Click in the terminal window where `npm start` is running, then press:

**Ctrl + C**

(On Mac, that is still Control+C, not Command+C.) Confirm if asked. The server stops and that terminal is free again.

---

## Other useful commands (optional)

Run these from inside the `brittanic` folder:

| What you want | Command |
| --- | --- |
| Start the app (same as above) | `npm start` |
| Build a production version | `npm run build` |
| Run tests | `npm test` |
| Open the rotoscope helper page | `npm run rotoscope` |

`npm run build` creates optimized files in a `dist` folder. You do not need this just to try the app locally.

---

## Optional: try the live site (no install)

If you only want to see the project without installing anything, open:

**https://davidhanson90.github.io/brittanic/**

That is the same app published with GitHub Pages. Local setup is for when you want to change the code yourself.

---

## Common problems and simple fixes

### “command not found” / “is not recognized”

- You typed `git`, `node`, or `npm`, but the computer cannot find the program.
- **Fix:** Install that program (see Steps 1–2), then **close and reopen** the terminal. On Windows, try restarting once after installing.

### Port 4200 is already in use

- Something else is already using that address (often another `npm start` you forgot to stop).
- **Fix:** Stop the other server with **Ctrl + C** in its terminal. Or close old terminal windows. Then run `npm start` again.

### `npm install` fails

- Check your internet connection and try again: `npm install`
- Make sure `node -v` and `npm -v` work.
- Prefer Node 24 (what this project’s CI uses). If your Node is very old, install a newer LTS from [nodejs.org](https://nodejs.org/).
- Delete the `node_modules` folder if it exists, then run `npm install` again. (On Mac/Linux: `rm -rf node_modules` then `npm install`. On Windows in PowerShell: `Remove-Item -Recurse -Force node_modules` then `npm install`.)

### The page is blank or looks broken

- Confirm the terminal still shows the server running and that you opened **http://localhost:4200/** (not a different port).
- Hard-refresh the browser (Ctrl+Shift+R on Windows/Linux, Cmd+Shift+R on Mac).
- Check the terminal for red error messages and share them with an AI agent or a friend if you need help.

### You are not in the project folder

- Commands like `npm install` and `npm start` must be run inside the `brittanic` folder (the one that contains `package.json`).
- **Fix:** `cd brittanic` (or `cd` to wherever you cloned it), then try again. You can confirm you are in the right place with `ls` (Mac/Linux) or `dir` (Windows) — you should see `package.json` and `GETTING_STARTED.md`.

---

## Building with AI agents

AI coding assistants (for example **Cursor**, **GitHub Copilot**, or **ChatGPT**-style agents) can help you change this project even if you are not an expert. Treat them like a careful junior teammate: give clear instructions, keep changes small, and review what they do before you accept it.

### Before you ask for changes

1. Get the project running locally with the steps above (`npm install`, then `npm start`).
2. Tell the agent to read this file and the main app files first so it understands the project.
3. Describe **one** change at a time.

### Good habits

- **Keep changes small.** “Add a pause button on the TV” is better than “rebuild the whole store.”
- **Review diffs** (the list of lines the agent wants to change) before accepting. If something looks unrelated, ask why or reject it.
- **Ask it to run or fix tests** when you change behaviour: `npm test`, and for a production check `npm run build`.
- **Never paste secrets** into the chat: passwords, API keys, private tokens, or `.env` files with real credentials. This project does not need those for normal local use.
- **Prefer HTTPS clone and normal npm commands** — you do not need to share your GitHub password with the agent.

### Example prompts you can copy

**Orient the agent first:**

> Please read `GETTING_STARTED.md`, `package.json`, `README.md`, and the main Angular files under `src/app/` (especially `three-scene.component.ts` and the files in `src/app/characters/`). Summarize how the store scene and characters work in plain English. Do not change any files yet.

**Ask for a small UI change:**

> In the Brittanic store scene, add a clear on-screen label when the user clicks the doorman character. Keep the change small, match the existing style in `src/app/`, and show me the diff before we commit.

**Ask for a new character or scene idea:**

> I want a new store character similar to the ones in `src/app/characters/`. Please look at an existing character file as a template, propose a short plan (files to add or edit), then implement a simple placeholder character named “Window Display Assistant” without breaking the current scene. Use `npm start` guidance from GETTING_STARTED if you need to verify.

**Ask it to run checks:**

> Run `npm test` and, if that looks fine, run `npm run build`. If anything fails, fix only what is needed and explain the errors in plain English.

**When something breaks:**

> `npm start` failed with this error: [paste the error text]. Read GETTING_STARTED.md’s troubleshooting section and the project config, then suggest the simplest fix. Do not refactor unrelated files.

### What “agent” means here

An **agent** is an AI assistant that can read your project files, suggest edits, and sometimes run commands in a terminal. You stay in charge: you decide what to accept, what to commit, and what to push to GitHub.

---

## Where to get more help

- This guide: `GETTING_STARTED.md`
- Short technical overview: `README.md`
- Live demo: [https://davidhanson90.github.io/brittanic/](https://davidhanson90.github.io/brittanic/)
- Project on GitHub: [https://github.com/Davidhanson90/brittanic](https://github.com/Davidhanson90/brittanic)

You have everything you need to install Git and Node, clone the repo, run the app, and work on it with an AI assistant step by step. Welcome aboard.
