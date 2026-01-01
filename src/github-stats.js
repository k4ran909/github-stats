const axios = require('axios');

class Queries {
    constructor(username, accessToken) {
        this.username = username;
        this.accessToken = accessToken;
        this.headers = {
            'Authorization': `Bearer ${this.accessToken}`,
            'User-Agent': 'github-stats-node'
        };
    }

    async query(generatedQuery) {
        try {
            const response = await axios.post('https://api.github.com/graphql', {
                query: generatedQuery
            }, {
                headers: this.headers
            });
            return response.data;
        } catch (error) {
            console.error('GraphQL query failed', error.message);
            return {};
        }
    }

    async queryRest(path, params = {}) {
        if (path.startsWith('/')) {
            path = path.substring(1);
        }

        // Try 60 times (simulating the Python loop)
        for (let i = 0; i < 60; i++) {
            try {
                const response = await axios.get(`https://api.github.com/${path}`, {
                    headers: this.headers,
                    params: params,
                    validateStatus: status => status < 500 // Accept 202, 204, etc
                });

                if (response.status === 202) {
                    console.log("A path returned 202. Retrying...");
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                } else if (response.status === 204) {
                    return {};
                } else if (response.status === 200) {
                    return response.data;
                }

                // Return data if present for other 2xx codes
                if (response.data) return response.data;
                return {};

            } catch (error) {
                console.error(`REST query failed for ${path}: ${error.message}`);
                // If network error, maybe wait and retry?
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        console.log("There were too many 202s. Data for this repository will be incomplete.");
        return {};
    }

    static reposOverview(contribCursor, ownedCursor) {
        return `{
  viewer {
    login,
    name,
    repositories(
        first: 100,
        orderBy: {
            field: UPDATED_AT,
            direction: DESC
        },
        isFork: false,
        after: ${ownedCursor ? `"${ownedCursor}"` : "null"}
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        nameWithOwner
        stargazers {
          totalCount
        }
        forkCount
        languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
          edges {
            size
            node {
              name
              color
            }
          }
        }
      }
    }
    repositoriesContributedTo(
        first: 100,
        includeUserRepositories: false,
        orderBy: {
            field: UPDATED_AT,
            direction: DESC
        },
        contributionTypes: [
            COMMIT,
            PULL_REQUEST,
            REPOSITORY,
            PULL_REQUEST_REVIEW
        ]
        after: ${contribCursor ? `"${contribCursor}"` : "null"}
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        nameWithOwner
        stargazers {
          totalCount
        }
        forkCount
        languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
          edges {
            size
            node {
              name
              color
            }
          }
        }
      }
    }
  }
}`;
    }

    static contribYears() {
        return `
query {
  viewer {
    contributionsCollection {
      contributionYears
    }
  }
}
`;
    }

    static contribsByYear(year) {
        return `
    year${year}: contributionsCollection(
        from: "${year}-01-01T00:00:00Z",
        to: "${parseInt(year) + 1}-01-01T00:00:00Z"
    ) {
      contributionCalendar {
        totalContributions
      }
    }
`;
    }

    static allContribs(years) {
        const byYears = years.map(Queries.contribsByYear).join("\n");
        return `
query {
  viewer {
    ${byYears}
  }
}
`;
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
    }

    async getStats() {
        // If already calculated, skip
        if (this._stargazers !== null) return;

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
                // Exclude if already seen or in exclude list
                if (this._repos.has(name) || this.excludeRepos.has(name)) continue;

                this._repos.add(name);
                this._stargazers += (repo.stargazers && repo.stargazers.totalCount) || 0;
                this._forks += repo.forkCount || 0;

                const languages = repo.languages || {};
                const edges = languages.edges || [];

                for (const lang of edges) {
                    const node = lang.node || {};
                    const langName = node.name || "Other";
                    if (excludeLangsLower.has(langName.toLowerCase())) continue;

                    if (this._languages[langName]) {
                        this._languages[langName].size += lang.size || 0;
                        this._languages[langName].occurrences += 1;
                    } else {
                        this._languages[langName] = {
                            size: lang.size || 0,
                            occurrences: 1,
                            color: node.color
                        };
                    }
                }
            }

            const ownedPageInfo = ownedRepos.pageInfo || {};
            const contribPageInfo = contribRepos.pageInfo || {};

            if (ownedPageInfo.hasNextPage || contribPageInfo.hasNextPage) {
                nextOwned = ownedPageInfo.endCursor || nextOwned;
                nextContrib = contribPageInfo.endCursor || nextContrib;
            } else {
                break;
            }
        }

        const langsTotal = Object.values(this._languages).reduce((sum, v) => sum + (v.size || 0), 0);
        for (const key in this._languages) {
            this._languages[key].prop = 100 * ((this._languages[key].size || 0) / langsTotal);
        }
    }

    async getTotalContributions() {
        if (this._totalContributions !== null) return this._totalContributions;

        this._totalContributions = 0;
        const yearsResponse = await this.queries.query(Queries.contribYears());
        const years = (((yearsResponse.data || {}).viewer || {}).contributionsCollection || {}).contributionYears || [];

        const byYearResponse = await this.queries.query(Queries.allContribs(years));
        const byYearViewer = (byYearResponse.data || {}).viewer || {};

        for (const key in byYearViewer) {
            const yearData = byYearViewer[key];
            this._totalContributions += (yearData.contributionCalendar || {}).totalContributions || 0;
        }

        return this._totalContributions;
    }

    async getLinesChanged() {
        if (this._linesChanged !== null) return this._linesChanged;

        let additions = 0;
        let deletions = 0;

        await this.getStats(); // Ensure repos are populated

        for (const repo of this._repos) {
            const r = await this.queries.queryRest(`/repos/${repo}/stats/contributors`);
            if (Array.isArray(r)) {
                for (const authorObj of r) {
                    const authorLogin = ((authorObj.author || {}).login || "");
                    if (authorLogin !== this.username) continue;

                    for (const week of (authorObj.weeks || [])) {
                        additions += week.a || 0;
                        deletions += week.d || 0;
                    }
                }
            }
        }
        this._linesChanged = [additions, deletions];
        return this._linesChanged;
    }

    async getViews() {
        if (this._views !== null) return this._views;

        let total = 0;
        await this.getStats(); // Ensure repos populated

        for (const repo of this._repos) {
            const r = await this.queries.queryRest(`/repos/${repo}/traffic/views`);
            const views = r.views || [];
            for (const view of views) {
                total += view.count || 0;
            }
        }

        this._views = total;
        return this._views;
    }
}

module.exports = { Stats };
