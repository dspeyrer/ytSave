<script lang="ts">
	import Loader from './Components/Loader.svelte'
	import state from './app'
</script>

{#await state.init()}
	<Loader />
{:then}
	{#if $state}
		<div id="wrapper">
			<img src={$state.thumbnail} alt="" id="thumb" />
			<br />
			<span id="title">{$state.title}</span>
			<span id="channel">
				<img src={$state.channel.icon} alt="" id="channelIcon" />
				{$state.channel.name}</span
			>
			<span id="duration">{$state.duration}</span>
			<span id="watched">Watched {$state.progress}%</span>
			<span id="date">{$state.published}</span>
			<span id="buttons">
				<button on:click={() => state.next(false)} id="skip">Skip</button>
				<button on:click={() => state.next(true)} id="wl">Add to Watch Later</button>
			</span>
		</div>
	{:else}
		loading
	{/if}
{/await}

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
