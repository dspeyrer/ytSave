<script context="module">
	const preload = Promise.all([document.fonts.load('14px Roboto')])
</script>

<script lang="ts">
	import Loader from './Components/Loader.svelte'
	import Userlist from './Components/Userlist.svelte'

	import { load } from './utils'
</script>

<Loader load={Promise.all([load(), preload])} let:data={[data]}>
	test
	{#if true}
		<Userlist />
	{/if}
</Loader>
