import context from './context'
import { preloadImage } from './utils'
import browser from 'webextension-polyfill'

async function sha1hash(data) {
	return [...new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(data)))]
		.map(i => i.toString(16))
		.join('')
}

async function apiAuthHeader() {
	let timestamp = Math.floor(new Date().getTime() / 1000)
	return `SAPISIDHASH ${timestamp}_${await sha1hash(
		timestamp + ' ' + context.get('SAPISID') + ' https://www.youtube.com'
	)}`
}

async function internalApiRequest(method, endpoint, body, requestContext) {
	return await fetch(
		`https://www.youtube.com/youtubei/v1/${endpoint}?key=${requestContext.INNERTUBE_API_KEY}&prettyPrint=false`,
		{
			mode: 'cors',
			credentials: 'include',
			headers: {
				Accept: '*/*',
				'Accept-Language': 'en-US,en;q=0.5',
				'Content-Type': 'application/json',
				'X-Goog-Visitor-Id': requestContext.INNERTUBE_CONTEXT.client.visitorData,
				'X-Youtube-Client-Name': requestContext.INNERTUBE_CONTEXT_CLIENT_NAME,
				'X-Youtube-Client-Version': requestContext.INNERTUBE_CONTEXT_CLIENT_VERSION,
				Authorization: await apiAuthHeader(),
				'X-Goog-AuthUser': requestContext.SESSION_INDEX,
				'X-Origin': 'https://www.youtube.com',
				'X-Goog-PageId': requestContext.DELEGATED_SESSION_ID,
				'Alt-Used': 'www.youtube.com',
				'Sec-Fetch-Dest': 'empty',
				'Sec-Fetch-Mode': 'no-cors',
				'Sec-Fetch-Site': 'same-origin',
				Pragma: 'no-cache',
				'Cache-Control': 'no-cache',
				[context.get('headerPrefix') + 'Referer']: 'https://www.youtube.com/feed/subscriptions',
				[context.get('headerPrefix') + 'Origin']: 'https://www.youtube.com'
			},
			body: JSON.stringify({
				context: requestContext.INNERTUBE_CONTEXT,
				...body
			}),
			method
		}
	).then(res => res.json())
}

function parseInternalApiData(data) {
	return data
		.match(/(?<=ytcfg\.set\({).*?(?=}\);)/gs)
		.map(i => JSON.parse('{' + i + '}'))
		.reduce((a, i) => {
			return { ...a, ...i }
		}, {})
}

async function getYoutubeData(url) {
	let data = await fetch('https://www.youtube.com/' + url, {
		credentials: 'include'
	}).then(res => res.text())

	return {
		initialData: JSON.parse('{' + data.match(/(?<=var ytInitialData = {).*?(?=};)/s) + '}'),
		context: parseInternalApiData(data)
	}
}

function parseSubscriptionsData(data) {
	return {
		token: data[data.length - 1].continuationItemRenderer
			? data.pop().continuationItemRenderer.continuationEndpoint.continuationCommand.token
			: null,
		items: data
			.flatMap(i => i.itemSectionRenderer.contents[0].shelfRenderer.content.gridRenderer.items)
			.map(({ gridVideoRenderer: i }) => {
				let overlayData = i.thumbnailOverlays.reduce(Object.assign, {}),
					badges = (i.ownerBadges || [])
						.concat(i.badges || [])
						.map(i => i.metadataBadgeRenderer.style.replace('BADGE_STYLE_TYPE_', '')),
					live = badges.includes('LIVE_NOW'),
					upcoming = 'upcomingEventData' in i

				return {
					id: i.videoId,
					thumbnail: `https://i.ytimg.com/vi/${i.videoId}/hqdefault.jpg`,
					title: i.title.runs[0].text,
					live,
					scheduled: upcoming ? i.upcomingEventData.startTime : false,
					published: live || upcoming ? null : i.publishedTimeText.simpleText,
					viewCount: upcoming
						? null
						: live
						? i.viewCountText.runs.reduce((a, i) => a + i.text, '')
						: i.viewCountText.simpleText,
					animatedThumbnail: i.richThumbnail
						? i.richThumbnail.movingThumbnailRenderer.movingThumbnailDetails.thumbnails.pop().url
						: null,
					channel: {
						name: i.shortBylineText.runs[0].text.trim(),
						id: i.shortBylineText.runs[0].navigationEndpoint.browseEndpoint.browseId,
						icon: i.channelThumbnail.thumbnails[0].url,
						verified: badges.includes('VERIFIED')
					},
					duration: live || upcoming ? null : overlayData.thumbnailOverlayTimeStatusRenderer.text.simpleText,
					progress: overlayData.thumbnailOverlayResumePlaybackRenderer
						? overlayData.thumbnailOverlayResumePlaybackRenderer.percentDurationWatched
						: 0,
					__DATA_RAW: i
				}
			})
	}
}

export async function getSubscriptionsFeed(token?: string): Promise<{
	token: string
	items: any[]
}> {
	if (token && context) {
		let response = await internalApiRequest(
			'POST',
			'browse',
			{
				continuation: token
			},
			context.get('feed')
		)

		try {
			return parseSubscriptionsData(
				response.onResponseReceivedActions[0].appendContinuationItemsAction.continuationItems
			)
		} catch (e) {
			if (response.responseContext.mainAppWebResponseContext.loggedOut) {
				return await new Promise(resolve => {
					setTimeout(() => {
						getSubscriptionsFeed(token).then(resolve)
					}, 1000)
				})
			}
		}
	} else {
		let response = await getYoutubeData('feed/subscriptions')

		context.set({
			feed: response.context,
			userIcon:
				response.initialData.topbar.desktopTopbarRenderer.topbarButtons.pop().topbarMenuButtonRenderer.avatar
					.thumbnails[0].url
		})

		return parseSubscriptionsData(
			response.initialData.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer
				.contents
		)
	}
}

const sortActive = (a, b) => (a.active ? -1 : b.active ? 1 : 0)

export async function getUsers() {
	let res = await fetch('https://www.youtube.com/getAccountSwitcherEndpoint', {
		credentials: 'include'
	})

	let resBody = await res.text()
	return await Promise.all(
		JSON.parse(resBody.slice(5))
			.data.actions[0].getMultiPageMenuAction.menu.multiPageMenuRenderer.sections.map(i => i.accountSectionListRenderer)
			.map((i, index) => {
				let email = index
					? i.contents[0].accountItemSectionRenderer.header.accountItemSectionHeaderRenderer.title.runs[0].text
					: i.header.googleAccountHeaderRenderer.email.simpleText

				let accounts = i.contents[0].accountItemSectionRenderer.contents
				accounts = (index ? accounts : accounts.slice(0, accounts.length - 1))
					.map(({ accountItem }) => {
						return {
							active: accountItem.isSelected,
							name: accountItem.accountName.simpleText,
							icon: accountItem.accountPhoto.thumbnails[0].url,
							endpoint:
								'https://www.youtube.com' +
								accountItem.serviceEndpoint.selectActiveIdentityEndpoint.supportedTokens.reduce((a, i) => {
									return { ...a, ...i }
								}, {}).accountSigninToken.signinUrl,
							byline: accountItem.accountByline.simpleText
						}
					})
					.sort(sortActive)
				return {
					email,
					active: !!accounts.find(i => i.active),
					accounts
				}
			})
			.sort(sortActive)
			.map(async i => ({
				...i,
				accounts: await Promise.all(
					i.accounts.map(async j => {
						await preloadImage(j.icon)
						return j
					})
				)
			}))
	)
}

export async function login() {
	await browser.tabs.create({
		url: 'https://accounts.google.com/AddSession'
	})

	window.close()
}

export async function editPlaylist(input, playlistId = 'WL') {
	let response = await internalApiRequest(
		'POST',
		'browse/edit_playlist',
		{
			playlistId,
			actions: (typeof input == 'string' ? [input] : Array.isArray(input) ? input : input.add || [])
				.map(i => ({
					addedVideoId: i,
					action: 'ACTION_ADD_VIDEO'
				}))
				.concat(
					(input.remove || []).map(i => ({
						removedVideoId: i,
						action: 'ACTION_REMOVE_VIDEO_BY_VIDEO_ID'
					}))
				)
		},
		context.get('feed')
	)

	if (response.status == 'STATUS_FAILED')
		await new Promise(resolve => setTimeout(() => editPlaylist(input, playlistId).then(resolve), 1000))
}
