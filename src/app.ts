type AnyObject = { [key: string]: any }
import browser from 'webextension-polyfill'
import * as yt from './youtube'
import context from './context'
import { load } from './utils'

export class State {
	private queue = []
	private subscribers = []

	private seen = []

	async init() {
		let { seen } = await browser.storage.sync.get('seen')
		this.seen = seen || []

		let { items, token } = await load()
		context.set({ token })

		this.queue = items.filter(i => !this.seen.includes(i.id))
		await this.continuePages()
	}

	private async continuePages() {
		if (!this.queue.length) this.update()

		while (!this.queue.length) {
			let { token, items } = await yt.getSubscriptionsFeed(context.get('token'))
			context.set({ token })

			this.queue = this.queue.concat(items.filter(i => !this.seen.includes(i.id)))
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

		this.seen.push(id)
		browser.storage.sync.set({ seen: this.seen })
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
