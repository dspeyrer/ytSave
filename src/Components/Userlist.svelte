<script lang="ts">
	import { login, getUsers } from '../youtube'
	import Loader from './Loader.svelte'
</script>

<div id="wrapper">
	{#await getUsers()}
		<Loader />
	{:then data}
		<div id="userList">
			{#each data as user}
				<span class="email">{user.email}</span>
				{#each user.accounts as account}
					<div class="user" on:click={() => alert('TODO')}>
						<img class="icon" src={account.icon} alt="" />
						<div class="name">{account.name}</div>
						<div class="subtitle">
							{account.byline}
						</div>
					</div>
				{/each}
			{/each}
			<div class="user" id="addNew" on:click={login}>
				<img src="adduser.svg" alt="" /> Add another account
			</div>
		</div>
	{/await}
</div>

<style>
	#wrapper {
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		position: fixed;
		top: 0;
	}

	#addNew {
		line-height: 15px;
		height: 14px;
	}

	#addNew img {
		margin-top: -2px;
		margin-left: 8px;
	}

	#userList .email {
		position: relative;
		display: block;
		cursor: default;
	}

	.icon {
		border-radius: 50%;
		width: 32px;
		height: 32px;
	}

	.user {
		display: grid;
		grid-template-columns: 32px max-content;
		white-space: nowrap;
		grid-template-rows: 16px 16px;
		gap: 0px 8px;
		grid-template-areas:
			'icon name'
			'icon subtitle';
		cursor: pointer;
		transition: background 0.1s 0s ease-in-out;
	}

	.user:hover {
		background: var(--hover);
	}

	.user .icon {
		grid-area: icon;
	}

	.user .name,
	.user .subtitle {
		text-overflow: ellipsis;
		white-space: nowrap;
		overflow: hidden;
	}

	.user .name {
		grid-area: name;
		align-self: end;
	}
	.user .subtitle {
		color: var(--subtitle-text);
		grid-area: subtitle;
		align-self: start;
	}

	#userList {
		border-radius: 5px;
		top: 10px;
		right: 10px;
		padding: 5px 0px;
		background: var(--background-secondary);
		box-shadow: 0px 0px 5px 1px var(--hover);
	}

	#userList > * {
		padding: 5px 15px;
	}
</style>
