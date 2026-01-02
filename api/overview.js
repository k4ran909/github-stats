const { Stats } = require('../src/github-stats');
const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
    const accessToken = process.env.ACCESS_TOKEN;
    const user = process.env.GITHUB_ACTOR;

    if (!accessToken) {
        res.status(500).send('<svg><text>Error: ACCESS_TOKEN not set</text></svg>');
        return;
    }
    // If not user, try to fetch viewer? Python code defaulted to "No Name" if viewer query failed, but required GITHUB_ACTOR env var.
    if (!user) {
        res.status(500).send('<svg><text>Error: GITHUB_ACTOR not set</text></svg>');
        return;
    }

    const excludeRepos = process.env.EXCLUDED ? process.env.EXCLUDED.split(',').map(x => x.trim()) : null;
    const excludeLangs = process.env.EXCLUDED_LANGS ? process.env.EXCLUDED_LANGS.split(',').map(x => x.trim()) : null;
    const ignoreForkedRepos = process.env.EXCLUDE_FORKED_REPOS === 'true';

    try {
        const stats = new Stats(user, accessToken, excludeRepos, excludeLangs, ignoreForkedRepos);

        await stats.getStats();

        const templatePath = path.join(process.cwd(), 'templates', 'overview.svg');
        // Check if template exists
        if (!fs.existsSync(templatePath)) {
            res.status(500).send(`<svg><text>Error: Template not found at ${templatePath}</text></svg>`);
            return;
        }

        let output = await fs.promises.readFile(templatePath, 'utf8');

        const totalContributions = await stats.getTotalContributions();
        const repoCount = stats._repos.size;

        const fmt = (n) => n.toLocaleString();

        // Use global replace if needed, but python 're.sub' replaces all occurrences?
        // JS replace string only replaces first occurrence. Use replaceAll or regex.
        // The templates use {{ name }} etc.

        output = output.replace(/{{ name }}/g, stats._name);
        output = output.replace(/{{ stars }}/g, fmt(stats._stargazers));
        output = output.replace(/{{ forks }}/g, fmt(stats._forks));
        output = output.replace(/{{ contributions }}/g, fmt(totalContributions));
        output = output.replace(/{{ repos }}/g, fmt(repoCount));

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'max-age=3600, s-maxage=3600');
        res.status(200).send(output);

    } catch (error) {
        console.error(error);
        res.status(500).send(`<svg><text>Error generating stats: ${error.message}</text></svg>`);
    }
};
