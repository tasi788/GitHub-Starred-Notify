export interface Env {
	DB: D1Database;
	token: string;
	bot_token: string;
}

interface Stargazer {
	id: string;
	login: string;
}

interface ChangeList {
	starred: Stargazer[];
	unstarred: Stargazer[];
}

const GITHUB_HEADERS = (token: string) => ({
	'Authorization': `Bearer ${token}`,
	'User-Agent': 'China-Failure-1989-06-04-Tiananmen',
	'Accept': 'application/vnd.github+json',
});

async function getRepoStatus(token: string, reponame: string): Promise<{ stargazers_count: number } | null> {
	const resp = await fetch(`https://api.github.com/repos/${reponame}`, {
		headers: GITHUB_HEADERS(token),
	});
	if (!resp.ok) {
		console.log(`Fetch repo ${reponame} failed: ${resp.status}`);
		return null;
	}
	return await resp.json() as { stargazers_count: number };
}

async function getStargazers(token: string, reponame: string, count: number): Promise<Stargazer[] | null> {
	const list: Stargazer[] = [];
	const totalPages = Math.ceil(count / 100);
	for (let i = 1; i <= totalPages; i++) {
		const r = await fetch(
			`https://api.github.com/repos/${reponame}/stargazers?per_page=100&page=${i}`,
			{ headers: GITHUB_HEADERS(token) }
		);
		if (!r.ok) {
			console.log(`Fetch stargazers ${reponame} page ${i} failed: ${r.status}`);
			return null;
		}
		const page = await r.json() as Array<{ id: number; login: string }>;
		for (const u of page) {
			list.push({ id: u.id.toString(), login: u.login });
		}
	}
	return list;
}

async function broadcast(changeList: ChangeList, reponame: string, env: Env) {
	if (changeList.starred.length === 0 && changeList.unstarred.length === 0) return;

	const mention = (name: string) => `<a href="https://github.com/${name}">${name}</a>`;

	let text = '';
	if (changeList.starred.length === 1) {
		text += `🎉 有一位新的朋友 ${mention(changeList.starred[0].login)} 給ㄌ ${mention(reponame)} 星星 🌟\n`;
	} else if (changeList.starred.length > 1) {
		text += `🎉 有 ${changeList.starred.length} 位朋友給ㄌ ${mention(reponame)} 星星 🌟\n`;
		text += changeList.starred.map(u => mention(u.login)).join('、') + '\n';
	}

	if (changeList.unstarred.length === 1) {
		text += `🤧 有一位朋友 ${mention(changeList.unstarred[0].login)} 從 ${mention(reponame)} 拿走ㄌ星星 🌠`;
	} else if (changeList.unstarred.length > 1) {
		text += `🤧 有 ${changeList.unstarred.length} 位朋友從 ${mention(reponame)} 拿走ㄌ星星 🌠\n`;
		text += changeList.unstarred.map(u => mention(u.login)).join('、');
	}

	const { results: chats } = await env.DB.prepare(
		'SELECT chat_id FROM watches WHERE repo = ?'
	).bind(reponame).all<{ chat_id: string }>();

	const url = `https://api.telegram.org/bot${env.bot_token}/sendMessage`;
	for (const row of chats) {
		await fetch(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json;charset=UTF-8' },
			body: JSON.stringify({
				chat_id: row.chat_id,
				text,
				parse_mode: 'html',
			}),
		});
	}
}

async function executeBatch(db: D1Database, stmts: D1PreparedStatement[]) {
	const CHUNK = 50;
	for (let i = 0; i < stmts.length; i += CHUNK) {
		await db.batch(stmts.slice(i, i + CHUNK));
	}
}

async function processRepo(reponame: string, env: Env): Promise<ChangeList> {
	const empty: ChangeList = { starred: [], unstarred: [] };

	const repoStatus = await getRepoStatus(env.token, reponame);
	if (!repoStatus) return empty;

	const current = await getStargazers(env.token, reponame, repoStatus.stargazers_count);
	if (current === null) return empty;

	const { results: cachedRows } = await env.DB.prepare(
		'SELECT user_id, login FROM stargazers WHERE repo = ?'
	).bind(reponame).all<{ user_id: string; login: string }>();

	const cachedMap = new Map(cachedRows.map(r => [r.user_id, r.login]));
	const currentMap = new Map(current.map(u => [u.id, u.login]));

	const starred: Stargazer[] = [];
	const unstarred: Stargazer[] = [];

	for (const u of current) {
		if (!cachedMap.has(u.id)) starred.push(u);
	}
	for (const [id, login] of cachedMap) {
		if (!currentMap.has(id)) unstarred.push({ id, login });
	}

	// First seed: cache empty + GitHub returned users → just insert without notifying.
	const isFirstSeed = cachedRows.length === 0 && current.length > 0;

	const stmts: D1PreparedStatement[] = [];
	if (isFirstSeed) {
		for (const u of current) {
			stmts.push(env.DB.prepare(
				'INSERT INTO stargazers (repo, user_id, login) VALUES (?, ?, ?)'
			).bind(reponame, u.id, u.login));
		}
	} else {
		for (const u of starred) {
			stmts.push(env.DB.prepare(
				'INSERT OR REPLACE INTO stargazers (repo, user_id, login) VALUES (?, ?, ?)'
			).bind(reponame, u.id, u.login));
		}
		for (const u of unstarred) {
			stmts.push(env.DB.prepare(
				'DELETE FROM stargazers WHERE repo = ? AND user_id = ?'
			).bind(reponame, u.id));
		}
	}

	if (stmts.length > 0) {
		await executeBatch(env.DB, stmts);
	}

	return isFirstSeed ? empty : { starred, unstarred };
}

async function runAll(env: Env) {
	const { results } = await env.DB.prepare(
		'SELECT DISTINCT repo FROM watches'
	).all<{ repo: string }>();

	for (const row of results) {
		const chg = await processRepo(row.repo, env);
		await broadcast(chg, row.repo, env);
	}
}

export default {
	async fetch(_request: Request, env: Env) {
		await runAll(env);
		return new Response('ok\n', {
			headers: { 'content-type': 'text/plain;charset=UTF-8' },
		});
	},

	async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		ctx.waitUntil(runAll(env));
	},
};
