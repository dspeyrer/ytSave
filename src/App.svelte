<script lang="ts">
	import Loader from './Components/Loader.svelte'
	import state from './app'
	import context from './context'
	/*
	document.addEventListener('keyup', ({ key }) => {
		switch (key) {
			case ',':
				state.next(0)
				break
			case '.':
				state.next(1)
				break
			case '/':
				state.next(2)
				break
		}
	})
	*/

	state.init()
</script>

{#if $state}
	<div id="wrapper">
		<svg width="400" height="225" id="thumb">
			<defs>
				<filter id="grayscale" x="0" y="0" width="100%" height="100%">
					<feColorMatrix
						type="saturate"
						values="0"
						x="0"
						y="0"
						width="{$state.progress}%"
						height="100%"
						in="SourceGraphic"
						result="gray"
					/>
					<feBlend mode="normal" in="gray" in2="SourceGraphic" />
				</filter>
			</defs>
			<image
				width="400"
				height="225"
				preserveAspectRatio="xMidYMid slice"
				href={$state.thumbnail}
				filter={$state.progress ? 'url(#grayscale)' : ''}
			/></svg
		>
		<span id="title">{$state.title}</span>
		<span id="channel">
			<img src={$state.channel.icon} alt="" id="channelIcon" />
			{$state.channel.name}</span
		>
		<span id="duration">{$state.duration}</span>
		<span id="date">{$state.published}</span>
		{#if $context.loadingCounter}
			<span id="loadingIndicator"><Loader size={18} /></span>
		{/if}
		<div id="buttons">
			<button on:click={() => state.next(0)} id="skip">Skip</button>
			<button on:click={() => state.next(1)} id="wl">Watch Later</button>
			<button on:click={() => state.next(2)} id="open">Open</button>
		</div>
	</div>
{:else}
	<div id="loaderWrapper">
		<Loader />
	</div>
{/if}

<style>
	#loaderWrapper {
		position: fixed;
		top: 0;
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	#wrapper {
		width: 400px;
		display: flex;
		flex-direction: column;
	}

	#loadingIndicator {
		bottom: 1px;
		left: 1px;
		padding: 0;
		background: transparent;
	}

	#channelIcon {
		border-radius: 50%;
		height: 24px;
		margin-right: 5px;
	}

	#buttons {
		height: 20px;
		margin: auto;
	}

	button {
		background-color: var(--color);
		border: 0;
		height: 20px;
	}

	span {
		position: absolute;
		background: rgba(0, 0, 0, 0.6);
		padding: 5px;
		border-radius: 5px;
	}

	#title {
		bottom: 25px;
		left: 5px;
		max-width: 300px;
	}

	#channel {
		top: 5px;
		left: 5px;
		padding-right: 6px;
		display: flex;
		align-items: center;
	}

	#duration {
		bottom: 25px;
		right: 5px;
	}

	#date {
		right: 5px;
		top: 5px;
	}

	#wl {
		--color: red;
	}

	#skip {
		--color: white;
	}

	#open {
		--color: darkgrey;
	}
</style>
