# Deployment Guide

This portfolio is optimized for deployment on **Vercel** or **Netlify**. Both offer free hosting, SSL certificates, and global CDNs.

## Option 1: Vercel (Recommended)

Vercel provides the best performance for this project and respects the `vercel.json` security configuration we created.

### Prerequisites
- A GitHub account.
- A Vercel account (log in with GitHub).
- Node.js installed locally (optional, for CLI).

### Steps
1.  **Push to GitHub**:
    - Create a new repository on GitHub.
    - Run these commands in your project folder:
      ```bash
      git remote add origin https://github.com/YOUR_USERNAME/portfolio.git
      git branch -M main
      git push -u origin main
      ```
2.  **Import to Vercel**:
    - Go to [Vercel Dashboard](https://vercel.com/dashboard).
    - Click **"Add New..."** -> **"Project"**.
    - Import your `portfolio` repository.
    - **Build Settings**: Leave everything as default.
    - Click **"Deploy"**.

### Security Verification
Once deployed, Vercel will automatically apply the security headers defined in `vercel.json`. You can verify this by checking the "Network" tab in your browser's developer tools on your live site.

## Option 2: Netlify

### Steps
1.  **Push to GitHub** (same as above).
2.  **Import to Netlify**:
    - Go to [Netlify](https://www.netlify.com/).
    - Click **"Add new site"** -> **"Import an existing project"**.
    - Choose GitHub and select your repository.
    - **Build Settings**: Leave blank/default.
    - Click **"Deploy site"**.

## Security Notes
- **Email**: Your email address is obfuscated in the source code to prevent spam bots from scraping it.
- **Headers**: The `vercel.json` file ensures your site resists clickjacking and XSS attacks.
- **Links**: All external links use `rel="noopener noreferrer"` to prevent tab-nabbing attacks.
