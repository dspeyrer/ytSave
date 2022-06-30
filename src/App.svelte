<script context="module">
	const preload = Promise.all([document.fonts.load('14px Roboto')])
</script>

<script lang="ts">
	import Loader from './Components/Loader.svelte'
	import { load } from './utils'
	import context from './context'
	import * as yt from './youtube'

	async function next() {
		$context.items.shift()
		if (!$context.items.length) context.set(await yt.getSubscriptionsFeed($context.token))
		context.update()
	}

	async function wl() {
		const current = $context.items.shift()
		yt.editPlaylist(current.id)
		if (!$context.items.length) context.set(await yt.getSubscriptionsFeed($context.token))
		context.update()
	}
</script>

<Loader load={Promise.all([load(), preload])}>
	<div id="wrapper">
		<img src={$context.items[0].thumbnail} alt="" id="thumb" />
		<br />
		<span id="title">{$context.items[0].title}</span>
		<span id="channel">
			<img src={$context.items[0].channel.icon} alt="" id="channelIcon" />
			{$context.items[0].channel.name}</span
		>
		<span id="duration">{$context.items[0].duration}</span>
		<span id="watched">Watched {$context.items[0].progress}%</span>
		<span id="date">Uploaded {$context.items[0].published}</span>
		<span id="buttons">
			<button on:click={next} id="skip">Skip</button>
			<button on:click={wl} id="wl">Add to Watch Later</button>
		</span>
	</div>
</Loader>

<style>
	#wrapper {
		width: 400px;
		display: flex;
		flex-direction: column;
	}

	#wrapper span {
		margin-left: 20px;
	}

	#thumb {
		width: 100%;
		height: 225px;
		object-fit: cover;
	}

	#channelIcon {
		border-radius: 50%;
		height: 24px;
	}

	#wl {
		background-color: red;
		border: red solid;
	}

	#skip {
		background-color: white;
		border: white solid;
	}
</style>
