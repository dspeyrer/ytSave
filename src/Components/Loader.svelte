<div class="wrapper">
	<div id="loader" role="progressbar">
		<div id="container">
			<div id="spinner">
				{#each [{ i: 'left', w: 4 }, { i: 'gap', w: 3.2 }, { i: 'right', w: 4 }] as { i, w }}
					<div id={i} class="sides">
						<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
							<circle cx="24" cy="24" r="18" stroke-dasharray="113.097" stroke-dashoffset="56.549" stroke-width={w} />
						</svg>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.wrapper {
		position: fixed;
		top: 0;
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	/**
  * @license
  * Copyright Google LLC All Rights Reserved.
  *
  * Use of this source code is governed by an MIT-style license that can be
  * found in the LICENSE file at https://github.com/material-components/material-components-web/blob/master/LICENSE
  */

	@keyframes loader-rotate {
		/* copyright */
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes loader-spinner-rotate {
		12.5% {
			transform: rotate(135deg);
		}
		25% {
			transform: rotate(270deg);
		}
		37.5% {
			transform: rotate(405deg);
		}
		50% {
			transform: rotate(540deg);
		}
		62.5% {
			transform: rotate(675deg);
		}
		75% {
			transform: rotate(810deg);
		}
		87.5% {
			transform: rotate(945deg);
		}
		100% {
			transform: rotate(1080deg);
		}
	}

	@keyframes left {
		from {
			transform: rotate(265deg);
		}
		50% {
			transform: rotate(130deg);
		}
		to {
			transform: rotate(265deg);
		}
	}

	@keyframes right {
		from {
			transform: rotate(-265deg);
		}
		50% {
			transform: rotate(-130deg);
		}
		to {
			transform: rotate(-265deg);
		}
	}

	#loader {
		display: inline-flex;
		position: relative;
		direction: ltr;
		line-height: 0;
		width: 48px;
		height: 48px;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	svg,
	#container,
	#spinner {
		position: absolute;
		width: 100%;
		height: 100%;
	}

	svg {
		fill: transparent;
		stroke: red;
		width: 200%;
	}

	.sides {
		display: inline-flex;
		position: relative;
		width: 50%;
		height: 100%;
		overflow: hidden;
	}

	#gap {
		position: absolute;
		top: 0;
		left: 47.5%;
		box-sizing: border-box;
		width: 5%;
		height: 100%;
		overflow: hidden;
	}

	#gap svg {
		left: -900%;
		width: 2000%;
		transform: rotate(180deg);
	}

	#left svg {
		animation: left 1333ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;
	}

	#right svg {
		left: -100%;
		animation: right 1333ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;
	}

	#container {
		font-size: 0;
		letter-spacing: 0;
		white-space: nowrap;
		animation: loader-rotate 1568.2352941176ms linear infinite;
	}

	#spinner {
		animation: loader-spinner-rotate 5332ms cubic-bezier(0.4, 0, 0.2, 1) infinite both;
	}
</style>
