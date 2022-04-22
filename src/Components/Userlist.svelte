<script lang="ts">
  import { getUsers } from "../youtube";
  import Loader from "./Loader.svelte";
</script>

<Loader load={getUsers()} let:data>
  {JSON.stringify(data)}
</Loader>
