require('dotenv').config();
const { Stats } = require('./src/github-stats');
const fs = require('fs');
const path = require('path');

async function main() {
    const accessToken = process.env.ACCESS_TOKEN;
    const user = process.env.GITHUB_ACTOR;

    if (!accessToken) {
        throw new Error("ACCESS_TOKEN environment variable required");
    }
    if (!user) {
        throw new Error("GITHUB_ACTOR environment variable required");
    }

    const excludeRepos = process.env.EXCLUDED ? process.env.EXCLUDED.split(',').map(x => x.trim()) : null;
    const excludeLangs = process.env.EXCLUDED_LANGS ? process.env.EXCLUDED_LANGS.split(',').map(x => x.trim()) : null;
    const ignoreForkedRepos = process.env.EXCLUDE_FORKED_REPOS === 'true';

    console.log(`Generating stats for ${user}...`);
    const stats = new Stats(user, accessToken, excludeRepos, excludeLangs, ignoreForkedRepos);
    await stats.getStats();

    // Ensure generated dir
    const genDir = path.join(__dirname, 'generated');
    if (!fs.existsSync(genDir)) fs.mkdirSync(genDir);

    // Generate Overview
    console.log("Generating overview.svg...");
    let overviewTpl = fs.readFileSync(path.join(__dirname, 'templates', 'overview.svg'), 'utf8');

    // Parallelize detailed stats
    const [totalContributions, linesChanged, views] = await Promise.all([
        stats.getTotalContributions(),
        stats.getLinesChanged(),
        stats.getViews()
    ]);
    const repoCount = stats._repos.size;
    const fmt = (n) => n.toLocaleString();

    overviewTpl = overviewTpl.replace(/{{ name }}/g, stats._name);
    overviewTpl = overviewTpl.replace(/{{ stars }}/g, fmt(stats._stargazers));
    overviewTpl = overviewTpl.replace(/{{ forks }}/g, fmt(stats._forks));
    overviewTpl = overviewTpl.replace(/{{ contributions }}/g, fmt(totalContributions));
    overviewTpl = overviewTpl.replace(/{{ lines_changed }}/g, fmt(linesChanged[0] + linesChanged[1]));
    overviewTpl = overviewTpl.replace(/{{ views }}/g, fmt(views));
    overviewTpl = overviewTpl.replace(/{{ repos }}/g, fmt(repoCount));

    fs.writeFileSync(path.join(genDir, 'overview.svg'), overviewTpl);

    // Generate Languages
    console.log("Generating languages.svg...");
    let langTpl = fs.readFileSync(path.join(__dirname, 'templates', 'languages.svg'), 'utf8');
    const languages = stats._languages;
    const sorted = Object.entries(languages).sort((a, b) => b[1].size - a[1].size);

    let progress = "";
    let langList = "";
    const delayBetween = 150;

    sorted.forEach((entry, i) => {
        const lang = entry[0];
        const data = entry[1];
        const color = data.color || "#000000";
        const prop = data.prop || 0;

        progress += `<span style="background-color: ${color};width: ${prop.toFixed(3)}%;" class="progress-item"></span>`;
        langList += `
<li style="animation-delay: ${i * delayBetween}ms;">
<svg xmlns="http://www.w3.org/2000/svg" class="octicon" style="fill:${color};"
viewBox="0 0 16 16" version="1.1" width="16" height="16"><path
fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8z"></path></svg>
<span class="lang">${lang}</span>
<span class="percent">${prop.toFixed(2)}%</span>
</li>

`;
    });

    langTpl = langTpl.replace(/{{ progress }}/g, progress);
    langTpl = langTpl.replace(/{{ lang_list }}/g, langList);

    fs.writeFileSync(path.join(genDir, 'languages.svg'), langTpl);

    console.log("Done. Images saved to 'generated/'");
}

main().catch(console.error);
