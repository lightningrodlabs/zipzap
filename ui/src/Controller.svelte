<script lang="ts">
  import Toolbar from "./Toolbar.svelte";
  import { ZipZapStore } from "./store";
  import { setContext } from "svelte";
  import type { AppAgentClient, EntryHash } from "@holochain/client";
  import type { ProfilesStore } from "@holochain-open-dev/profiles";
  import SvgIcon from "./SvgIcon.svelte";
  import Avatar from "./Avatar.svelte";
  import StreamPane from "./StreamPane.svelte";
  import { cloneDeep } from "lodash";
  import { v1 as uuidv1 } from "uuid";
  import ThingItem from "./ThingItem.svelte";
  import type { WeClient } from "@lightningrodlabs/we-applet";
  import { encodeHashToBase64 } from "@holochain/client";

  export let roleName = "";
  export let client: AppAgentClient;
  export let profilesStore: ProfilesStore;
  export let weClient : WeClient

  let store: ZipZapStore = new ZipZapStore(
    weClient,
    profilesStore,
    client,
    roleName,
  );

  setContext("store", {
    getStore: () => store,
  });

  $: myAgentPubKeyB64 = store.myAgentPubKeyB64
  $: myProfile = store.profilesStore.myProfile
  $: thingHashes = store.thingHashes
  $: thingsList = store.thingsList
  $: allProfiles = store.profilesStore.allProfiles
  $: allPeople = $allProfiles.status=== "complete" ? Array.from($allProfiles.value.entries()) : []

  let fileinput;
  const onFileSelected = (e) => {
    let file = e.target.files[0];
    let reader = new FileReader();

    reader.addEventListener(
      "load",
      async () => {
        const b = JSON.parse(reader.result as string);
        await store.makeThing(b);
      },
      false
    );
    reader.readAsText(file);
  };
</script>

<div class="flex-scrollable-parent">
  <div class="flex-scrollable-container">
    <div class="app">
      {#if store}
        <Toolbar />

        People:
        {#each allPeople as [hash,profile]}
          {@const hb64 = encodeHashToBase64(hash)}
          {#if hb64 != myAgentPubKeyB64}
            <StreamPane hash={hash} />
          {/if}
          
        {/each}
            <!-- <div class="welcome-text">
              <div style="display:flex; flex-direction:column">

                {#if $myProfile.status == "complete"}
                  {@const myName = $myProfile.value.entry.nickname}
                <div style="margin-bottom:10px">
                  <h3>Things:</h3>
                  {#if $thingHashes.status == "complete"}
                    {#each $thingHashes.value as hash}
                      <ThingItem 
                        on:create={ 
                          async (e) => {
                            console.log("CREATING")
                          }
                        }
                        on:settings={
                          (e) => {
                            console.log("SETTINGS")
                          }
                        }
                        thingHash={hash}>
                      </ThingItem>
        
                    {/each}
                  {:else if $thingHashes.status == "error"}
                    Error!: {$thingHashes.error}
                  {/if}
      
                </div>
                {/if}
                <div class="new-type">
                  <h3>New Thing:</h3>
                  <input
                    style="display:none"
                    type="file"
                    accept=".json"
                    on:change={(e) => onFileSelected(e)}
                    bind:this={fileinput}
                  />
                  <sl-button
                    on:click={() => newBoardDialog.open()}
                    style=""
                    title="New Thing"
                    >New <SvgIcon icon=faSquarePlus size="16" /></sl-button
                  >
                  <sl-button
                    on:click={() => {
                      fileinput.click();
                    }}
                    title="Import Game"
                    >Import <SvgIcon icon=faFileImport size="16" /></sl-button
                  >
                  
                </div>
              </div>
            </div> -->
      {:else}
        <div class="loading"><div class="loader" /></div>
      {/if}
    </div>
  </div>
</div>

<style>
  .app {
    margin: 0;
    padding-bottom: 10px;
    background-image: var(--bg-img, url(""));
    background-size: cover;
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100vh;
  }
  :global(:root) {
    --resizeable-height: 200px;
    --tab-width: 60px;
  }

  @media (min-width: 640px) {
    .app {
      max-width: none;
    }
  }
  .welcome-text {
    display: flex;
    border-radius: 5px;
    border: 1px solid #222;
    margin: auto;
    margin-top: 50px;
    max-width: 650px;
    padding: 26px;
    box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.5);
    background-color: white;
  }
  .loading {
    text-align: center;
    padding-top: 100px;
  }
  .loader {
    border: 8px solid #f3f3f3;
    border-radius: 50%;
    border-top: 8px solid #3498db;
    width: 50px;
    height: 50px;
    -webkit-animation: spin 2s linear infinite; /* Safari */
    animation: spin 2s linear infinite;
    display: inline-block;
  }
  @-webkit-keyframes spin {
    0% {
      -webkit-transform: rotate(0deg);
    }
    100% {
      -webkit-transform: rotate(360deg);
    }
  }
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
  .flex-scrollable-parent {
    position: relative;
    display: flex;
    flex: 1;
  }
  .flex-scrollable-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
  .flex-scrollable-x {
    max-width: 100%;
    overflow-x: auto;
  }
  .flex-scrollable-y {
    max-height: 100%;
    overflow-y: auto;
  }
</style>
