# GitHub Asset Store — Product Overview & UI Flow

---

# 🧠 Product Overview

## 🎯 Core Value Proposition

> **Turn any GitHub repository into a lightweight public asset CDN.**

Users:

* Connect GitHub
* Select one of their repositories
* Upload images/files
* Instantly receive a public URL

No external storage. No S3. No complex setup.

---

# 🏗 Conceptual Architecture

## Actors

* User
* Your GitCDN Web App (React + Express)
* GitHub API
* User’s GitHub Repository

## Data Ownership Model

* Files live inside the **user’s GitHub repo**
* The app stores **no file data**
* The app stores session/user metadata and encrypted GitHub tokens

---

# 👥 Target Users

## 1️⃣ Indie Developer

Needs quick image hosting for a personal site.

## 2️⃣ SaaS Founder

Wants public asset hosting without managing cloud storage.

## 3️⃣ Open Source Maintainer

Wants centralized asset hosting for docs or demo sites.

---

# 🧭 High-Level User Journey

1. Land on homepage
2. Connect GitHub
3. Complete GitHub OAuth authorization
4. Choose repository
5. Upload asset
6. Copy public URL
7. Done

---

# 🖥 UI Flow — Screen by Screen

---

# 1️⃣ Landing Page

## Goal

Explain the product in under 10 seconds.

## Sections

### Hero

**Headline:**

> Use GitHub as Your Asset CDN

**Subtext:**

> Upload images to your GitHub repo and get instant public URLs.

**Primary CTA:**

* Connect GitHub

---

### How It Works (3 Steps)

1. Connect your GitHub
2. Choose a repository
3. Upload & get a public URL

---

### Trust Signals

* Open Source
* No file storage on our servers
* You own your assets

---

# 2️⃣ Authentication Flow

1. Click “Connect GitHub”
2. GitHub OAuth login
3. OAuth callback returns to app
4. App loads user repositories

---

# 3️⃣ Onboarding Screen (First-Time Users)

## Step 1 — Confirm Connection

Message:

> GitHub connected successfully.

## Step 2 — Choose Repository

Dropdown showing:

* Repository name
* Public / Private badge
* Default branch

CTA:

* Use this repository

Optional notice:

> Only public repositories support public URLs.

---

# 4️⃣ Main Dashboard

## Layout Structure

### Sidebar (Minimal)

* Upload
* My Assets
* Settings

### Main Panel

**Top Bar**

* Selected repository
* Selected branch
* Change repository button

---

# 5️⃣ Upload Interface

## Upload Card

Drag & drop area:

* Drag & drop file
* Or select file

Under it:

* Supported file types
* Maximum file size
* Optional folder selector (default: `/assets/`)

Primary button:

* Upload

---

## Success State

After successful upload:

Display:

* File name
* File size
* Generated public URL
* Copy button
* Open in browser
* View on GitHub

Example URLs:

**Raw GitHub**

```
https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
```

**jsDelivr CDN**

```
https://cdn.jsdelivr.net/gh/{owner}/{repo}@{branch}/{path}
```

---

# 6️⃣ Asset List Page

Grid or table layout.

## Columns

* Preview thumbnail
* File name
* Size
* Upload date
* Copy URL button
* Delete action

Delete should remove file via GitHub API.

---

# 7️⃣ Settings Page

Displays:

* Connected GitHub account
* Installed repositories
* Change repository
* Reconnect GitHub OAuth
* Disconnect

---

# 🔐 Security UX Considerations

## If Repository Is Private

Display warning:

> Private repositories do not provide public URLs.

Options:

* Make repository public
* Future: Use signed proxy URLs

---

# 📂 Folder Structure Strategy

Recommended default:

```
/assets/{yyyy}/{mm}/{filename}
```

Benefits:

* Organized
* Prevents clutter
* Easy scanning

---

# 🏷 File Naming Strategy

Recommended:

* Append random hash to filename

Example:

```
logo-82hd92.png
```

Prevents accidental overwrites.

---

# 🚀 MVP Feature Scope

## Must Have

* GitHub authentication
* OAuth callback + session persistence
* Repository selection
* File upload
* Public URL generation
* Copy-to-clipboard button

---

## Nice To Have

* Asset listing
* Delete functionality
* Drag & drop upload
* Folder selector

---

## Future Enhancements

* Image optimization
* Versioning
* Tagging
* Team/org support
* Private repo proxy support
* Usage statistics

---

# ⚠ Technical Constraints

## GitHub Limits

* Files larger than 100MB not supported
* API rate limits apply
* Raw GitHub URLs are not a full CDN

## Recommendation

Encourage use of jsDelivr CDN URLs.

## Suggested File Size Limit

5–10MB per file for MVP.

---

# 🎨 Visual Design Direction

* Developer-focused aesthetic
* Minimal and clean
* Dark mode default
* GitHub-inspired styling
* Clear copy-to-clipboard UX
* Optional terminal-style feedback

---

# 🧩 Edge Cases to Design For

* Repository deleted after selection
* OAuth access revoked
* Repository permissions revoked
* Branch renamed
* File with same name exists
* Private repository selected

Each case should have a clear and friendly UI message.

---

# 📊 Product Definition Summary

## What This App Is

A GitHub-native asset publisher.

## What This App Is Not

* A full media management system
* A cloud storage replacement
* A private CDN (initially)

---

# 🏁 Final MVP Definition

A lightweight GitHub-powered asset uploader that:

* Authenticates users via GitHub
* Allows repository selection
* Uploads files directly to the repository
* Returns instant public URLs
* Requires no external storage provider
