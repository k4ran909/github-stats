# GitHub Stats Visualization

<a href="https://github.com/jstrieb/github-stats">
<img src="generated/overview.svg" height="150" alt="Overview" />
<img src="generated/languages.svg" height="150" alt="Languages" />
</a>

Generate visualizations of GitHub user and repository statistics. Visualizations can include data for both private repositories, and for repositories you have contributed to, but do not own.

Generated images automatically switch between GitHub light theme and GitHub dark theme.

This project is a port of [jstrieb/github-stats](https://github.com/jstrieb/github-stats) to **Node.js**.

## Features

- **Node.js & Vercel**: Built with Node.js, ready for Vercel Serverless deployment.
- **Dynamic Generation**: Stats are generated on-the-fly when accessed via URL.
- **Static Generation**: Includes a script to generate static SVG files locally.
- **Private Data**: Supports analyzing private repositories using your Personal Access Token.

---

## 🚀 Vercel Deployment (Recommended)

Host this project on Vercel to generate statistics dynamically via a URL.

1.  **Fork** this repository to your GitHub account.
2.  Import the project into [Vercel](https://vercel.com).
3.  In Vercel **Project Settings > Environment Variables**, add:
    *   `ACCESS_TOKEN`: Your GitHub Personal Access Token (scopes: `read:user`, `repo` if including private repos).
    *   `GITHUB_ACTOR`: Your GitHub Username.
4.  (Optional) Add other configuration variables (see Configuration below).
5.  **Deploy**.

Once deployed, access your stats at:
*   `https://<your-project>.vercel.app/api/overview`
*   `https://<your-project>.vercel.app/api/languages`

**Usage in Markdown:**
```md
![Overview](https://<your-project>.vercel.app/api/overview)
![Languages](https://<your-project>.vercel.app/api/languages)
```

> **Note on Timeouts**: GitHub takes time to calculate stats for large accounts. If your Vercel function times out (504), run the local generation script once (`npm run generate`) to warm up GitHub's cache for your repository.

---

## 💻 Local Installation

Generate static SVGs locally on your machine.

1.  Clone the repository:
    ```bash
    git clone https://github.com/<your-username>/github-stats.git
    cd github-stats
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the root directory:
    ```env
    ACCESS_TOKEN=your_github_token
    GITHUB_ACTOR=your_username
    ```
4.  Run the generator:
    ```bash
    npm run generate
    ```
5.  Find your images in the `generated/` folder.

---

## ⚙️ Configuration

Use these Environment Variables (in `.env` or Vercel) to customize behavior:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `ACCESS_TOKEN` | **Required**. GitHub PAT. | `ghp_...` |
| `GITHUB_ACTOR` | **Required**. GitHub Username. | `k4ran` |
| `EXCLUDED` | Repositories to ignore. | `owner/repo1,owner/repo2` |
| `EXCLUDED_LANGS` | Languages to ignore. | `HTML,CSS` |
| `EXCLUDE_FORKED_REPOS` | Set to `true` to skip forks. | `true` |

---

## Disclaimer

If the project is used with an access token that has sufficient permissions to read private repositories, it may leak details about those repositories in error messages (e.g. if the `axios` request fails and logs the URL). Exercise caution when sharing logs or deploying public instances with private access tokens.

Due to GitHub API limitations, some statistics (like view counts) may be approximations or updated with a delay.

## Credits & Support

Original project by [Jacob Strieb](https://github.com/jstrieb/github-stats).
Rewritten/Ported to Node.js.

- [GitHub Octicons](https://primer.style/octicons/) are used to match GitHub UI.

To support the original author:
- [Electronic Frontier Foundation](https://supporters.eff.org/donate/)
- [Signal Foundation](https://signal.org/donate/)
- [Mozilla](https://donate.mozilla.org/en-US/)
- [The Internet Archive](https://archive.org/donate/index.php)