<script lang="ts">
    import '@shoelace-style/shoelace/dist/components/button/button.js';
    import { getContext, onMount } from "svelte";
    import Avatar from './Avatar.svelte';
    import { get } from 'svelte/store';    
    import SvgIcon from "./SvgIcon.svelte";
    import { isWeContext } from '@lightningrodlabs/we-applet';
    import { Stream, type ZipZapStore } from "./store";
    import { encodeHashToBase64 } from '@holochain/client';

    const { getStore } :any = getContext('store');
    const store:ZipZapStore = getStore();
    
    export let hash
    let  hb64 = encodeHashToBase64(hash)

    let streamId=JSON.stringify([store.myAgentPubKeyB64,hb64].sort())
     //@ts-ignore
     $: myProfile = get(store.profilesStore.myProfile).value
    if (!store.streams[streamId]) {
      store.streams[streamId] = new Stream(streamId)
    }

    onMount(async () => {
        // if (!myName) {
        //     editAvatarDialog.open()
        // }
	  });
    $:messages = store.streams[streamId].messages
    let inputElement;
    let disabled

</script>
<div class="person-feed">
    <div class="header">
        <Avatar size={16} agentPubKey={hash} placeholder={false} showNickname={true}/>
    </div>
    <div class="stream">
      {#each $messages as msg}
        <div class="msg"
          class:my-msg={encodeHashToBase64(msg.from) == store.myAgentPubKeyB64}
          >
          {#if msg.payload.type == "Msg"}
            {msg.payload.text}
            <span class="msg-timestamp">{store.timeAgo.format(msg.received)}</span>
          {/if}
        </div>
      {/each}
    </div>
    <div class="send-controls">
      <sl-input bind:this={inputElement}
        on:sl-input={(e)=>disabled = !e.target.value || !inputElement.value}
        placeholder="Message"
        style="width:100%"
        ></sl-input>
        
      <sl-button 
          style="margin-left:10px;"
          variant="primary"
          disabled={disabled}
          on:click={async ()=>{
            await store.client.sendMessage(streamId, {type:"Msg", text:inputElement.value, created: Date.now()},[hash, store.myAgentPubKey])
            inputElement.value=""
        }}>Send
      </sl-button>
    </div>
  </div>

<style>
.person-feed{
    margin-top:10px;
    display:flex; 
    flex-direction:column;
    border: solid 1px lightblue;
    border-radius: 10px;
    background-color: gray;
  }
  .stream {
    background-color: #444;
    display:flex;
    flex-direction: column;
    overflow-y:auto;
  }
  .msg {
    margin: 5px;
    border-radius: 20px;
    color: white;
    padding: 3px 10px;
    flex-shrink: 1;
    align-self: flex-start;
    background-color: gray;
  }
  .my-msg {
    align-self: flex-end;
    background-color: blue;
  }
  .send-controls {
    display:flex;
    justify-content: flex-end;
    padding: 5px;
  }
  .msg-timestamp {
    margin-left:4px;
    font-size: 80%;
    color: #ccc;
  }

</style>