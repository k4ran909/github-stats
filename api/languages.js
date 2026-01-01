const { Stats } = require('../src/github-stats');
const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
    const accessToken = process.env.ACCESS_TOKEN;
    const user = process.env.GITHUB_ACTOR;

    if (!accessToken || !user) {
        res.status(500).send('<svg><text>Error: ACCESS_TOKEN or GITHUB_ACTOR not set</text></svg>');
        return;
    }

    const excludeRepos = process.env.EXCLUDED ? process.env.EXCLUDED.split(',').map(x => x.trim()) : null;
    const excludeLangs = process.env.EXCLUDED_LANGS ? process.env.EXCLUDED_LANGS.split(',').map(x => x.trim()) : null;
    const ignoreForkedRepos = process.env.EXCLUDE_FORKED_REPOS === 'true';

    try {
        const stats = new Stats(user, accessToken, excludeRepos, excludeLangs, ignoreForkedRepos);

        await stats.getStats();

        const templatePath = path.join(process.cwd(), 'templates', 'languages.svg');
        if (!fs.existsSync(templatePath)) {
            res.status(500).send(`<svg><text>Error: Template not found at ${templatePath}</text></svg>`);
            return;
        }

        let output = await fs.promises.readFile(templatePath, 'utf8');

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

        output = output.replace(/{{ progress }}/g, progress);
        output = output.replace(/{{ lang_list }}/g, langList);

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'max-age=3600, s-maxage=3600');
        res.status(200).send(output);

    } catch (error) {
        console.error(error);
        res.status(500).send(`<svg><text>Error generating stats: ${error.message}</text></svg>`);
    }
};
