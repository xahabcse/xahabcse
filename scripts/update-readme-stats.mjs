import fs from 'fs';

const USERNAME = 'xahabcse';
const TOKEN = process.env.GITHUB_TOKEN;
const README_PATH = 'README.md';

const headers = {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
};

async function fetchUser() {
    const res = await fetch(`https://api.github.com/users/${USERNAME}`, { headers });

    return res.json();
}

async function fetchRepos() {
    const res = await fetch(`https://api.github.com/users/${USERNAME}/repos?per_page=100&type=owner`, { headers });

    return res.json();
}

async function fetchYearCommits() {
    const to = new Date();
    const from = new Date();
    from.setFullYear(from.getFullYear() - 1);

    const query = `
        query($login: String!, $from: DateTime!, $to: DateTime!) {
            user(login: $login) {
                contributionsCollection(from: $from, to: $to) {
                    totalCommitContributions
                }
            }
        }
    `;

    const res = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query,
            variables: { login: USERNAME, from: from.toISOString(), to: to.toISOString() }
        })
    });
    const json = await res.json();

    return json.data?.user?.contributionsCollection?.totalCommitContributions ?? 0;
}

function getTopLanguage(repos) {
    const counts = {};

    for (const repo of repos) {
        if (repo.language != null) {
            counts[repo.language] = (counts[repo.language] ?? 0) + 1;
        }
    }

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
        return 'N/A';
    }

    return `${sorted[0][0]} (${sorted[0][1]} repos)`;
}

function getAccountAge(createdAt) {
    const created = new Date(createdAt);
    const now = new Date();
    let years = now.getFullYear() - created.getFullYear();
    let months = now.getMonth() - created.getMonth();

    if (months < 0) {
        years--;
        months += 12;
    }

    if (now.getDate() < created.getDate()) {
        months--;

        if (months < 0) {
            years--;
            months += 12;
        }
    }

    const sinceLabel = created.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const yearLabel = years === 1 ? 'year' : 'years';
    const monthLabel = months === 1 ? 'month' : 'months';

    return { duration: `${years} ${yearLabel}, ${months} ${monthLabel}`, since: sinceLabel };
}

function buildBlock(user, repos, commits) {
    const topLanguage = getTopLanguage(repos);
    const uptime = getAccountAge(user.created_at);

    return `<table>
<tr>
<td width="46%" valign="top">

\`\`\`text
                ##
              ######
            ##########
          ##############
        ##################
      ######################
    ##########################
      ######################
        ##################
          ##############
            ##########
              ######
                ##
\`\`\`

</td>
<td width="54%" valign="top">

\`\`\`text
sahabuddin@xahabcse
--------------------
OS: ..................... Software Engineer
Host: .................... OnnoRokom Projukti Limited
Uptime: .................. ${uptime.duration}
Joined: .................. ${uptime.since}
Kernel: .................. .NET 8 / Hono / React 19
IDE: ..................... VS Code, Claude Code

Languages.Programming: ... C#, Python, TypeScript, JavaScript
Languages.Web: ........... HTML, CSS, SQL

- Contact ---------------------------------
Email: ................... sujoncep@gmail.com
Portfolio: ............... xahabcse.me
LinkedIn: ................ linkedin.com/in/xahabcse

- GitHub Stats (auto-updated daily) -------
Public Repos: ............ ${user.public_repos}
Followers: ............... ${user.followers}  ·  Following: ${user.following}
Commits (last 12 months): . ${commits}
Top Language: ............ ${topLanguage}
\`\`\`

</td>
</tr>
</table>`;
}

async function main() {
    const [user, repos, commits] = await Promise.all([fetchUser(), fetchRepos(), fetchYearCommits()]);
    const block = buildBlock(user, repos, commits);

    const readme = fs.readFileSync(README_PATH, 'utf-8');
    const startMarker = '<!-- STATS:START -->';
    const endMarker = '<!-- STATS:END -->';
    const startIndex = readme.indexOf(startMarker);
    const endIndex = readme.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
        console.error('STATS markers not found in README.md');
        process.exit(1);
    }

    const before = readme.slice(0, startIndex + startMarker.length);
    const after = readme.slice(endIndex);
    const updated = `${before}\n${block}\n${after}`;

    fs.writeFileSync(README_PATH, updated);
    console.log('README stats updated.');
}

main();
