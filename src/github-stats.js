
// Native fetch implementation - lighter and no dependencies
// Optimized with concurrent requests

class Queries {
    constructor(username, accessToken) {
        this.username = username;
        this.accessToken = accessToken;
        this.headers = {
            'Authorization': `Bearer ${this.accessToken}`,
            'User-Agent': 'github-stats-node',
            'Content-Type': 'application/json'
        };
    }

    async query(generatedQuery) {
        try {
            const res = await fetch('https://api.github.com/graphql', {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({ query: generatedQuery })
            });
            return await res.json();
        } catch (error) {
            console.error('GraphQL query failed', error.message);
            return {};
        }
    }

    async queryRest(path, params = {}) {
        if (path.startsWith('/')) path = path.substring(1);

        const url = new URL(`https://api.github.com/${path}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

        // Limit retries to 10 instead of 60 to fail faster if stuck, or keep high for reliability?
        // User complained about slowness. 202 is unavoidable for fresh stats.
        // We'll keep it robust but maybe log less.
        for (let i = 0; i < 40; i++) {
            try {
                const res = await fetch(url, { headers: this.headers });

                if (res.status === 202) {
                    await new Promise(r => setTimeout(r, 2000));
                    continue;
                }
                if (res.status === 204) return {};
                if (res.ok) return await res.json();

                return {};
            } catch (err) {
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        return {};
    }

    static reposOverview(contribCursor, ownedCursor) {
        return `{
  viewer {
    login,
    name,
    repositories(
        first: 100,
        orderBy: { field: UPDATED_AT, direction: DESC },
        isFork: false,
        after: ${ownedCursor ? `"${ownedCursor}"` : "null"}
    ) {
      pageInfo { hasNextPage, endCursor }
      nodes {
        nameWithOwner
        stargazers { totalCount }
        forkCount
        languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
          edges { size, node { name, color } }
        }
      }
    }
    repositoriesContributedTo(
        first: 100,
        includeUserRepositories: false,
        orderBy: { field: UPDATED_AT, direction: DESC },
        contributionTypes: [COMMIT, PULL_REQUEST, REPOSITORY, PULL_REQUEST_REVIEW]
        after: ${contribCursor ? `"${contribCursor}"` : "null"}
    ) {
      pageInfo { hasNextPage, endCursor }
      nodes {
        nameWithOwner
        stargazers { totalCount }
        forkCount
        languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
          edges { size, node { name, color } }
        }
      }
    }
  }
}`;
    }

    static contribYears() {
        return `query { viewer { contributionsCollection { contributionYears } } }`;
    }

    static allContribs(years) {
        const byYears = years.map(year => `
    year${year}: contributionsCollection(
        from: "${year}-01-01T00:00:00Z",
        to: "${parseInt(year) + 1}-01-01T00:00:00Z"
    ) { contributionCalendar { totalContributions } }
`).join("\n");
        return `query { viewer { ${byYears} } }`;
    }
}

class Stats {
    constructor(username, accessToken, excludeRepos = null, excludeLangs = null, ignoreForkedRepos = false) {
        this.username = username;
        this.ignoreForkedRepos = ignoreForkedRepos;
        this.excludeRepos = new Set(excludeRepos || []);
        this.excludeLangs = new Set(excludeLangs || []);
        this.queries = new Queries(username, accessToken);

        this._name = null;
        this._stargazers = null;
        this._forks = null;
        this._totalContributions = null;
        this._languages = null;
        this._repos = null;
        this._linesChanged = null;
        this._views = null;

        this._fetchPromise = null;
    }

    async getStats() {
        if (this._fetchPromise) return this._fetchPromise;

        this._fetchPromise = (async () => {
            this._stargazers = 0;
            this._forks = 0;
            this._languages = {};
            this._repos = new Set();

            const excludeLangsLower = new Set([...this.excludeLangs].map(x => x.toLowerCase()));

            let nextOwned = null;
            let nextContrib = null;

            while (true) {
                let rawResults = await this.queries.query(Queries.reposOverview(nextContrib, nextOwned));
                rawResults = rawResults || {};
                const data = rawResults.data || {};
                const viewer = data.viewer || {};

                if (!this._name) {
                    this._name = viewer.name || viewer.login || "No Name";
                }

                const contribRepos = viewer.repositoriesContributedTo || {};
                const ownedRepos = viewer.repositories || {};

                let repos = ownedRepos.nodes || [];
                if (!this.ignoreForkedRepos) {
                    repos = repos.concat(contribRepos.nodes || []);
                }

                for (const repo of repos) {
                    if (!repo) continue;
                    const name = repo.nameWithOwner;
                    if (this._repos.has(name) || this.excludeRepos.has(name)) continue;

                    this._repos.add(name);
                    this._stargazers += (repo.stargazers?.totalCount) || 0;
                    this._forks += repo.forkCount || 0;

                    for (const lang of (repo.languages?.edges || [])) {
                        const node = lang.node || {};
                        const langName = node.name || "Other";
                        if (excludeLangsLower.has(langName.toLowerCase())) continue;

                        if (!this._languages[langName]) {
                            this._languages[langName] = { size: 0, occurrences: 0, color: node.color };
                        }
                        this._languages[langName].size += lang.size || 0;
                        this._languages[langName].occurrences += 1;
                    }
                }

                if (ownedRepos.pageInfo?.hasNextPage || contribRepos.pageInfo?.hasNextPage) {
                    nextOwned = ownedRepos.pageInfo?.endCursor || nextOwned;
                    nextContrib = contribRepos.pageInfo?.endCursor || nextContrib;
                } else {
                    break;
                }
            }
            // Add props
            const langsTotal = Object.values(this._languages).reduce((sum, v) => sum + v.size, 0);
            for (const key in this._languages) {
                this._languages[key].prop = langsTotal ? 100 * (this._languages[key].size / langsTotal) : 0;
            }
        })();

        return this._fetchPromise;
    }

    async getTotalContributions() {
        if (this._totalContributions !== null) return this._totalContributions;

        this._totalContributions = 0;
        const yearsResponse = await this.queries.query(Queries.contribYears());
        const years = yearsResponse.data?.viewer?.contributionsCollection?.contributionYears || [];

        if (years.length === 0) return 0;

        const byYearResponse = await this.queries.query(Queries.allContribs(years));
        const byYearViewer = byYearResponse.data?.viewer || {};

        for (const key in byYearViewer) {
            this._totalContributions += (byYearViewer[key]?.contributionCalendar?.totalContributions || 0);
        }
        return this._totalContributions;
    }

    async getLinesChanged() {
        if (this._linesChanged !== null) return this._linesChanged;
        let additions = 0;
        let deletions = 0;
        await this.getStats();

        const repos = Array.from(this._repos);
        const concurrency = 10;

        const worker = async (repo) => {
            const r = await this.queries.queryRest(`/repos/${repo}/stats/contributors`);
            if (Array.isArray(r)) {
                for (const authorObj of r) {
                    if (authorObj.author?.login === this.username) {
                        for (const week of (authorObj.weeks || [])) {
                            additions += (week.a || 0);
                            deletions += (week.d || 0);
                        }
                    }
                }
            }
        };

        for (let i = 0; i < repos.length; i += concurrency) {
            await Promise.all(repos.slice(i, i + concurrency).map(worker));
        }

        this._linesChanged = [additions, deletions];
        return this._linesChanged;
    }

    async getViews() {
        if (this._views !== null) return this._views;
        let total = 0;
        await this.getStats();

        const repos = Array.from(this._repos);
        const concurrency = 10;

        const worker = async (repo) => {
            const r = await this.queries.queryRest(`/repos/${repo}/traffic/views`);
            if (r.views) {
                for (const view of r.views) total += (view.count || 0);
            }
        };

        for (let i = 0; i < repos.length; i += concurrency) {
            await Promise.all(repos.slice(i, i + concurrency).map(worker));
        }

        this._views = total;
        return this._views;
    }
}

module.exports = { Stats };
