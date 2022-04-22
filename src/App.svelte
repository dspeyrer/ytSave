<script context="module">
  const preload = Promise.all([document.fonts.load("14px Roboto")]);
</script>

<script lang="ts">
  import Loader from "./Components/Loader.svelte";
  import Content from "./Components/Content.svelte";

  import { load } from "./utils";
</script>

<Loader load={Promise.all([load(), preload])} let:data={[data]}>
  <Content />
</Loader>
