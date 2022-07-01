type AnyObject = { [key: string]: any }

export class Store {
	private value = {}
	private subscribers = []

	subscribe(fn: (value: AnyObject) => void): () => void {
		fn(this.value)
		this.subscribers.push(fn)
		return () => (this.subscribers = this.subscribers.filter(i => i != fn))
	}

	set(value: AnyObject) {
		Object.assign(this.value, value)
		this.update()
	}

	get(value: string): any {
		return this.value[value]
	}

	update() {
		this.subscribers.forEach(i => i(this.value))
	}
}

export default new Store()
