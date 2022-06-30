import browser from 'webextension-polyfill'
import * as yt from './youtube'
import context from './context'

export async function load() {
	context.set({
		isFirefox: navigator.userAgent.includes('Firefox/'),
		headerPrefix: '__YTSAVE_HEADER_' + Math.random().toString(36).slice(2) + '_'
	})

	browser.webRequest.onBeforeSendHeaders.addListener(
		({ requestHeaders }) => {
			requestHeaders
				.filter(i => i.name.startsWith(context.get('headerPrefix')))
				.forEach(i => {
					let name = i.name.replace(context.get('headerPrefix'), '')

					requestHeaders = requestHeaders.filter(
						j => j.name.toLowerCase() != name.toLowerCase() && j.name.toLowerCase() != i.name.toLowerCase()
					)
					requestHeaders.push({ name, value: i.value })
				})

			return { requestHeaders }
		},
		{
			urls: ['https://www.youtube.com/*']
		},
		context.get('isFirefox') ? ['requestHeaders', 'blocking'] : ['requestHeaders', 'blocking', 'extraHeaders']
	)

	context.set({
		SAPISID: await browser.cookies
			.get({
				url: 'https://www.youtube.com',
				name: 'SAPISID'
			})
			.then(({ value }) => value)
	})

	let { seen } = await browser.storage.sync.get('seen')

	context.set({
		seen: seen || []
	})

	context.set(await yt.getSubscriptionsFeed())
}

export function preloadImage(url: string) {
	return new Promise(resolve => {
		let img = new Image()
		img.onload = resolve
		img.src = url
	})
}
