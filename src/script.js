import browser from 'webextension-polyfill'

const loader = document.getElementById('loadingContainer'),
	content = document.getElementById('content'),
	activeIcon = document.getElementById('activeIcon'),
	userList = document.getElementById('userList'),
	userListWrapper = document.getElementById('userList-wrapper'),
	headerPrefix = '__YTSAVE_HEADER_' + Math.random().toString(36).slice(2) + '_',
	sortActive = (a, b) => (a.active ? -1 : b.active ? 1 : 0),
	preloadImage = url =>
		new Promise(resolve => {
			let img = new Image()
			img.onload = resolve
			img.src = url
		}),
	cssToMs = string => (string.includes('m') ? parseFloat(string) : parseFloat(string) * 1000)

let SAPISID,
	firefox = navigator.userAgent.includes('Firefox/')

activeIcon.onclick = showUserlist

browser.webRequest.onBeforeSendHeaders.addListener(
	({ requestHeaders }) => {
		requestHeaders
			.filter(i => i.name.startsWith(headerPrefix))
			.forEach(i => {
				let name = i.name.replace(headerPrefix, '')

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
	firefox ? ['requestHeaders', 'blocking'] : ['requestHeaders', 'blocking', 'extraHeaders']
)

function hideUserlist() {
	userListWrapper.style.opacity = '0'
	userListWrapper.style.pointerEvents = 'none'
	activeIcon.style.opacity = '1'
	setTimeout(() => (userList.innerHTML = ''), cssToMs(getComputedStyle(content).transitionDuration))
}

async function showUserlist() {
	let users = await getUsers()

	await Promise.all(users.flatMap(user => user.accounts.map(account => preloadImage(account.icon))))

	users.forEach(i => {
		let email = document.createElement('span')
		email.className = 'email'
		email.innerHTML = i.email
		userList.appendChild(email)
		i.accounts.forEach(j => {
			let el = document.createElement('div')
			el.className = 'user'
			el.onclick = j.active ? hideUserlist : () => changeUser(j.endpoint)
			el.innerHTML = `<img class="icon" src="${j.icon}"/>
          <div class="name">${j.name}</div>
          <div class="subtitle">
            ${j.byline}
          </div>`
			userList.appendChild(el)
		})
	})

	let addAccount = document.createElement('div')
	addAccount.id = 'addNew'
	addAccount.className = 'user'
	addAccount.innerHTML = `<img src="adduser.svg" /> Add another account`
	addAccount.onclick = login
	userList.appendChild(addAccount)
	userListWrapper.style.opacity = '1'
	userListWrapper.style.pointerEvents = 'auto'
	activeIcon.style.opacity = '0'
}

userListWrapper.onclick = hideUserlist

function changeUser(endpoint) {
	loader.style.opacity = '1'
	content.style.opacity = '0'
	hideUserlist()
	fetch(endpoint, {
		headers: {
			[headerPrefix + 'Origin']: 'https://www.youtube.com'
		}
	}).then(load)
}

async function getYoutubeData(url) {
	let data = await fetch('https://www.youtube.com/' + url, {
		credentials: 'include'
	}).then(res => res.text())

	return {
		initialData: JSON.parse('{' + data.match(/(?<=var ytInitialData = {).*?(?=};)/s) + '}'),
		context: getInternalApiParams(data)
	}
}

function getInternalApiParams(data) {
	return data
		.match(/(?<=ytcfg\.set\({).*?(?=}\);)/gs)
		.map(i => JSON.parse('{' + i + '}'))
		.reduce((a, i) => {
			return { ...a, ...i }
		}, {})
}

async function editPlaylist(context, input, playlistId = 'WL') {
	await internalApiRequest(
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
		context
	)
}

async function getPlaylistData(context, videoId) {
	let data = await internalApiRequest(
		'POST',
		'playlist/get_add_to_playlist',
		{
			excludeWatchLater: false,
			videoIds: [videoId]
		},
		context
	)

	return data.contents[0].addToPlaylistRenderer.playlists.map(({ playlistAddToOptionRenderer: i }) => ({
		id: i.playlistId,
		name: i.title.simpleText,
		privacy: i.privacy,
		hasVideo: i.containsSelectedVideos
	}))
}

// async function createPlaylist(context, name, privacy, videoId)

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
					thumbnail: `https://i.ytimg.com/vi/${i.videoId}/maxresdefault.jpg`,
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

async function getSubscriptionsFeed(token, context) {
	if (token && context) {
		let response = await internalApiRequest(
			'POST',
			'browse',
			{
				continuation: token
			},
			context
		)

		return parseSubscriptionsData(response.onResponseReceivedActions[0].appendContinuationItemsAction.continuationItems)
	} else {
		let response = await getYoutubeData('feed/subscriptions')
		return {
			...parseSubscriptionsData(
				response.initialData.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer
					.contents
			),
			etc: {
				context: response.context,
				userIcon:
					response.initialData.topbar.desktopTopbarRenderer.topbarButtons.pop().topbarMenuButtonRenderer.avatar
						.thumbnails[0].url
			}
		}
	}
}

async function sha1hash(data) {
	return [...new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(data)))]
		.map(i => i.toString(16))
		.join('')
}

async function apiAuthHeader() {
	let timestamp = Math.floor(new Date().getTime() / 1000)
	return `SAPISIDHASH ${timestamp}_${await sha1hash(timestamp + ' ' + SAPISID + ' https://www.youtube.com')}`
}

async function internalApiRequest(method, endpoint, body, context) {
	return await fetch(
		`https://www.youtube.com/youtubei/v1/${endpoint}?key=${context.INNERTUBE_API_KEY}&prettyPrint=false`,
		{
			mode: 'cors',
			credentials: 'include',
			headers: {
				Accept: '*/*',
				'Accept-Language': 'en-US,en;q=0.5',
				'Content-Type': 'application/json',
				'X-Goog-Visitor-Id': context.INNERTUBE_CONTEXT.client.visitorData,
				'X-Youtube-Client-Name': context.INNERTUBE_CONTEXT_CLIENT_NAME,
				'X-Youtube-Client-Version': context.INNERTUBE_CONTEXT_CLIENT_VERSION,
				Authorization: await apiAuthHeader(),
				'X-Goog-AuthUser': context.SESSION_INDEX,
				'X-Origin': 'https://www.youtube.com',
				'X-Goog-PageId': context.DELEGATED_SESSION_ID,
				'Alt-Used': 'www.youtube.com',
				'Sec-Fetch-Dest': 'empty',
				'Sec-Fetch-Mode': 'no-cors',
				'Sec-Fetch-Site': 'same-origin',
				Pragma: 'no-cache',
				'Cache-Control': 'no-cache',
				[headerPrefix + 'Referer']: 'https://www.youtube.com/feed/subscriptions',
				[headerPrefix + 'Origin']: 'https://www.youtube.com'
			},
			body: JSON.stringify({
				context: context.INNERTUBE_CONTEXT,
				...body
			}),
			method
		}
	).then(res => res.json())
}

async function login() {
	await browser.tabs.create({
		url: 'https://accounts.google.com/AddSession'
	})

	window.close()
}

async function getUsers() {
	let res = await fetch('https://www.youtube.com/getAccountSwitcherEndpoint', {
		credentials: 'include'
	})

	let resBody = await res.text()
	return JSON.parse(resBody.slice(5))
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
}

async function load() {
	await Promise.all([
		document.fonts.load('14px Roboto'),
		preloadImage('adduser.svg'),
		browser.cookies
			.get({
				url: 'https://www.youtube.com',
				name: 'SAPISID'
			})
			.then(cookie => (SAPISID = cookie.value))
			.then(getSubscriptionsFeed)
			.then(({ token, items, etc }) => {
				activeIcon.src = etc.userIcon
				x = [token, items, etc.context]
			})
	])

	loader.style.opacity = '0'
	content.style.opacity = '1'
}

load()
