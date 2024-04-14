<script lang="ts">
    import '@shoelace-style/shoelace/dist/components/button/button.js';
    import { getContext, onMount } from "svelte";
    import Avatar from './Avatar.svelte';
    import { get } from 'svelte/store';    
    import SvgIcon from "./SvgIcon.svelte";
    import { isWeContext } from '@lightningrodlabs/we-applet';
    import type {  ZipZapStore } from "./store";
    import { encodeHashToBase64 } from '@holochain/client';
    import { Stream } from './stream';

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
    $:acks = store.streams[streamId].acks
    $:lastSeen = store.lastSeen

    let inputElement;
    let disabled
    const sendMessage = async ()=>{
            await store.client.sendMessage(streamId, {type:"Msg", text:inputElement.value, created: Date.now()},[hash, store.myAgentPubKey])
            inputElement.value=""
        }
</script>
<div class="person-feed">
    <div class="header">
    </div>
    <div class="stream">
      {#each $messages as msg}
        {@const isMyMessage = encodeHashToBase64(msg.from) == store.myAgentPubKeyB64}
        <div class="msg"
          class:my-msg={isMyMessage}
          >
          {#if msg.payload.type == "Msg"}
            {@const ack = $acks[msg.payload.created]}
            {msg.payload.text}
            <span class="msg-timestamp">{new Date(msg.received).toLocaleTimeString()}</span>
            {#if isMyMessage}
              { ack && ack.get(hash)?"✓":""}
            {/if}
          {/if}
        </div>
      {/each}
    </div>
    <div class="send-controls">
      <sl-input bind:this={inputElement}
        on:sl-input={(e)=>disabled = !e.target.value || !inputElement.value}
        on:keydown={(e)=> {
            if (e.keyCode == 13) {
              sendMessage()
              e.stopPropagation()
            }
        }}
        placeholder="Message"
        style="width:100%"
        ></sl-input>
        
      <sl-button 
          style="margin-left:10px;"
          circle
          disabled={disabled}
          on:click={sendMessage}
          ><SvgIcon icon=zipzap size=20 />
      </sl-button>
    </div>
  </div>

<style>
  .person-feed{
    padding-left:10px;
    display:flex; 
    flex-direction:column;
    background-color: lightgoldenrodyellow;
  }
  .header {
    display: flex;
    justify-content: flex-end;
  }
  .stream {
    display:flex;
    flex-direction: column;
    overflow-y:auto;
  }
  .msg {
    margin: 5px;
    border-radius: 0px 15px 0px 15px;
    color: white;
    padding: 3px 10px;
    flex-shrink: 1;
    align-self: flex-start;
    background-color: rebeccapurple;
  }
  .my-msg {
    border-radius: 15px 0px 15px 0px ;
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