export class Store {
  private value = {};
  private subscribers = [];

  subscribe(fn: (value: object) => void): () => void {
    fn(this.value);
    this.subscribers.push(fn);
    return () => (this.subscribers = this.subscribers.filter((i) => i != fn));
  }

  set(value: object) {
    Object.assign(this.value, value);
    this.subscribers.forEach((i) => i(value));
  }

  get(value: string) {
    return this.value[value];
  }
}

export default new Store();
