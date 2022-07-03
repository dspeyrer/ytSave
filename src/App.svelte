<script lang="ts">
	import Loader from './Components/Loader.svelte'
	import state from './app'
</script>

{#await state.init()}
	<Loader />
{:then}
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
			<div id="buttons">
				<button on:click={() => state.next(0)} id="skip">Skip</button>
				<button on:click={() => state.next(1)} id="wl">Watch Later</button>
				<button on:click={() => state.next(2)} id="open">Open</button>
			</div>
		</div>
	{:else}
		<Loader />
	{/if}
{/await}

<style>
	#wrapper {
		width: 400px;
		display: flex;
		flex-direction: column;
	}

	#channelIcon {
		border-radius: 50%;
		height: 24px;
		margin-right: 5px;
	}

	#buttons {
		height: 20px;
	}

	button {
		background-color: var(--color);
		border: var(--color) solid;
		border-radius: 5px;
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
