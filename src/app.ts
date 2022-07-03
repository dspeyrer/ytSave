type AnyObject = { [key: string]: any }
import browser from 'webextension-polyfill'
import * as yt from './youtube'
import context from './context'
import { load } from './utils'

type Pool = {
	id: string
	left: number
	data: string[]
}

class Seen {
	private pools: Pool[]

	constructor() {
		this.pools = '0123456789ax'.split('').map(i => ({ id: i, left: 0, data: [] }))
	}

	async init() {
		for (let pool of this.pools) {
			let data = (await browser.storage.sync.get(pool.id))[pool.id] || ''
			pool.data = data.match(/.{11}/g) || []
			pool.left = (pool.id == 'x' ? 372 : 744) - pool.data.length
		}
	}

	async add(id: string): Promise<void> {
		for (let pool of this.pools) {
			if (pool.left) {
				pool.data.push(id)
				pool.left--
				await browser.storage.sync.set({ [pool.id]: pool.data.join('') })
				return
			}
		}
	}

	has(id: string): boolean {
		for (let pool of this.pools) if (pool.data.includes(id)) return true
		return false
	}
}

export class State {
	private queue = []
	private subscribers = []

	private seen: Seen

	constructor() {
		this.seen = new Seen()
	}

	async init() {
		await this.seen.init()

		let { items, token } = await load()
		context.set({ token })

		this.queue = items.filter(i => !this.seen.has(i.id))
		await this.continuePages()
	}

	private async continuePages() {
		if (!this.queue.length) this.update()

		while (!this.queue.length) {
			let { token, items } = await yt.getSubscriptionsFeed(context.get('token'))
			context.set({ token })

			this.queue = this.queue.concat(items.filter(i => !this.seen.has(i.id)))
		}

		this.update()
	}

	next(action: number) {
		let { id } = this.queue.shift()
		this.continuePages()

		if (action == 1) yt.editPlaylist(id)
		else if (action == 2)
			browser.tabs.create({
				active: false,
				url: `https://www.youtube.com/watch?v=${id}`
			})

		this.seen.add(id)
	}

	subscribe(fn: (value: AnyObject) => void): () => void {
		fn(this.queue[0] || null)
		this.subscribers.push(fn)
		return () => (this.subscribers = this.subscribers.filter(i => i != fn))
	}

	update() {
		this.subscribers.forEach(i => i(this.queue[0] || null))
	}
}

const app = new State()

export default app
