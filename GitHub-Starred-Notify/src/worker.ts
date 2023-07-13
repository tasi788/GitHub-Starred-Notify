export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	KVWatch: KVNamespace;
	KVStarred: KVNamespace;
	token: string;
	bot_token: string;
}

export interface User {
	id: string,
		url: string,
}

export interface UserList {
	list: Array < User >
}

async function getRepoStatus(token: string, reponame: string) {
	let url = 'https://api.github.com/repos/' + reponame

	let resp = await fetch(url, {
		headers: {
			'Authentication': `Bearer ${token}`,
			'User-Agent': 'China-Failure-1989-06-04-Tiananmen'
		}
	});
	if (resp.ok === false) {
		return console.log('Fetch Repo data err.')
	}

	let repo = JSON.parse(await resp.text())
	if (typeof repo != 'object') {
		return console.log('JSON Parse err')
	}
	return repo
}

async function getStarredUser(token: string, reponame: string, repo: any) {
	let starredList = []
	var totalPages = Math.ceil(repo.stargazers_count / 100) + 1
	let url = 'https://api.github.com/repos/' + reponame + '/stargazers?per_page=100&page=';
	for (let i = 1; i < totalPages; i++) {
		var r = await fetch(url + i, {
			headers: {
				'Authentication': `Bearer ${token}`,
				'User-Agent': 'China-Failure-1989-06-04-Tiananmen'
			}
		});
		var tmp = JSON.parse(await r.text());
		for (let x = 0; x < tmp.length; x++) {
			// id name url | id login url
			let t = {
				"id": tmp[x].id.toString(),
				"url": tmp[x].login
			}
			starredList.push(t);
		}
	};
	return starredList
}


async function broadcast(changeList: {
	starred: User[],
	unstarred: User[],
}, reponame: string, env: Env) {
	async function mention(name: string) {
		return `<a href="https://github.com/${name}">${name}</a>`
	}
	let url = `https://api.telegram.org/bot${env.bot_token}/sendMessage`
	// let payload = {}
	let text = ''
	if (changeList.starred.length > 0) {
		if (changeList.starred.length == 1) {
			text += '🎉 有一位新的朋友 ' + await mention(changeList.starred[0].url) +
				' 給ㄌ ' + await mention(reponame) + ' 星星 🌟\n'
		}
		if (changeList.starred.length > 1) {
			text += '🎉 有 ' + changeList.starred.length + ' 位朋友給ㄌ ' +
				await mention(reponame) + ' 星星 🌟\n'
			for (let i = 0; i < changeList.starred.length; i++) {
				text += await mention(changeList.starred[i].url)
				if (i != changeList.starred.length - 1) {
					text += '、'
				}
			}
		}
	}

	if (changeList.unstarred.length > 0) {
		if (changeList.unstarred.length == 1) {
			text += '🤧 有一位朋友 ' + await mention(changeList.unstarred[0].url) +
				' 從 ' + await mention(reponame) + ' 拿走ㄌ星星 🌠'
		}
		if (changeList.unstarred.length > 1) {
			text += '🤧 有 ' + changeList.unstarred.length +
				' 位朋友從 ' + await mention(reponame) +
				' 拿走ㄌ星星 🌠\n'
			for (let i = 0; i < changeList.unstarred.length; i++) {
				text += await mention(changeList.unstarred[i].url)
				if (i != changeList.unstarred.length - 1) {
					text += '、'
				}
			}
		}
	}
	let _ = await env.KVWatch.get(reponame)
	let repo = JSON.parse(_!)
	let data: {
		text: string,
		chat_id: string,
		parse_mode: string
	} = {
		text: text,
		chat_id: '',
		parse_mode: 'html'
	}
	for (let i = 0; i < repo.length; i++) {
		data.chat_id = repo[i]
		let init = {
			body: JSON.stringify(data),
			method: 'POST',
			headers: {
				'content-type': 'application/json;charset=UTF-8',
			},

		}
		let result = await fetch(url, init)
	}

	// post
	// payload

}

async function proccess(userlist: Array < User > , reponame: string, env: Env) {
	let starredList = await env.KVStarred.get(reponame);
	let cachedKeyList: Array < User > = JSON.parse(starredList!)
	let changeList: {
		starred: User[],
		unstarred: User[],
	} = {
		"starred": [],
		"unstarred": [],
	}
	if (starredList == null) {
		await env.KVStarred.put(reponame, JSON.stringify(userlist))
	}

	// looping fetch latest list
	if (starredList != null) {
		for (let i = 1; i < userlist.length; i++) {
			// new user starred
			if (typeof cachedKeyList.find(obj => obj.id == userlist[i].id) != 'object') {
				changeList.starred.push(userlist[i])
				await env.KVStarred.put(reponame, JSON.stringify(userlist))
			}

		}

		for (let i = 0; i < cachedKeyList.length && starredList != null; i++) {
			if (typeof userlist.find(obj => obj.id == cachedKeyList[i].id) == 'undefined') {
				changeList.unstarred.push(cachedKeyList[i])
				await env.KVStarred.put(reponame, JSON.stringify(userlist))
			}
		}
	}
	return changeList
}

export default {
	// The scheduled handler is invoked at the interval set in our wrangler.toml's
	// [[triggers]] configuration.
	async fetch(request: Request, env: Env) {
		const repolist = await env.KVWatch.list();

		// FutaGuard/LowTechFilter: null
		for (let i = 0; i < repolist.keys.length; i++) {
			let reponame: string = repolist.keys[i].name
			let repoStatus = await getRepoStatus(env.token, reponame)
			let users: Array < User > = await getStarredUser(env.token, reponame, repoStatus)
			// let b = {id: '123'}

			let chg = await proccess(users, reponame, env)
			await broadcast(chg, reponame, env)
			const json = JSON.stringify(chg, null, 2);
			return new Response(json, {
				headers: {
					"content-type": "application/json;charset=UTF-8",
				},
			});

		}

	},

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise < void > {
		const repolist = await env.KVWatch.list();

		// FutaGuard/LowTechFilter: null
		for (let i = 0; i < repolist.keys.length; i++) {
			let reponame: string = repolist.keys[i].name
			let repoStatus = await getRepoStatus(env.token, reponame)
			let users: Array < User > = await getStarredUser(env.token, reponame, repoStatus)

			let chg = await proccess(users, reponame, env)
			await broadcast(chg, reponame, env)
		}
	},
};
