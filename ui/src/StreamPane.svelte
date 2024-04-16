<script lang="ts">
    import '@shoelace-style/shoelace/dist/components/button/button.js';
    import { getContext, onMount } from "svelte";
    import { get } from 'svelte/store';    
    import SvgIcon from "./SvgIcon.svelte";
    import { isWeContext } from '@lightningrodlabs/we-applet';
    import type {  ZipZapStore } from "./store";
    import { encodeHashToBase64 } from '@holochain/client';
    import { Stream, type Payload } from './stream';
    import {isActive} from "./util"
    import type { AgentPubKey } from '@holochain/client';
    import type { HoloHashMap } from '@holochain-open-dev/utils';
  import { is_empty } from 'svelte/internal';

    const { getStore } :any = getContext('store');
    const store:ZipZapStore = getStore();
    
    export let hashes:Array<AgentPubKey>
    export let streamId: string

    const showFrom = streamId == "_all" || JSON.parse(streamId).length > 2

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
      const payload: Payload = {type:"Msg", text:inputElement.value, created: Date.now()}
      await store.sendMessage(streamId, payload, hashes)
      inputElement.value=""
    }
    const getAckCount = (acks: { [key: number]: HoloHashMap<Uint8Array, boolean>; }, msgId) : number =>{
      const ack = acks[msgId]
      if (ack) {
        return ack.size
      }
      return 0
    }
</script>
<div class="person-feed">
  <div class="header">
    <span>Messages: {$messages.length}</span>
    <div style="display:flex;">
      {#each hashes as hash}
        {@const hb64 = encodeHashToBase64(hash)}
        <div style={isActive($lastSeen, hash)?"": "opacity: .5;"} title={`Last Seen: ${ $lastSeen.get(hash) ? new Date($lastSeen.get(hash)).toLocaleTimeString(): "never"}`} >
          <agent-avatar  disable-copy={true} size={20} agent-pub-key="{hb64}"></agent-avatar>
        </div>
      {/each}
    </div>
  </div>
  <div class="stream">
      {#each $messages as msg}
        {@const isMyMessage = encodeHashToBase64(msg.from) == store.myAgentPubKeyB64}
        <div class="msg"
          class:my-msg={isMyMessage}
          >
          {#if msg.payload.type == "Msg"}
            {#if !isMyMessage && showFrom}
              <agent-avatar style="margin-right:5px" disable-copy={true} size={20} agent-pub-key="{encodeHashToBase64(msg.from)}"></agent-avatar>
            {/if}
            {msg.payload.text}
            <span title={`Received: ${new Date(msg.received).toLocaleTimeString()}`} class="msg-timestamp">{new Date(msg.payload.created).toLocaleTimeString()}</span>
            {#if isMyMessage}
              {@const ackCount = getAckCount($acks, msg.payload.created)}
              {#if ackCount == hashes.length}
              ✓
              {:else if hashes.length>1}
                <span class="ack-count">{ackCount}</span>
              {/if}
            {/if}
          {/if}
        </div>
      {/each}
    </div>
    <div class="send-controls">
      <sl-input style="width:100%" bind:this={inputElement}
        on:sl-input={(e)=>disabled = !e.target.value || !inputElement.value}
        on:keydown={(e)=> {
            if (e.keyCode == 13) {
              sendMessage()
              e.stopPropagation()
            }
        }}
        placeholder="Message"
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
    width: 100%;
  }
  .header {
    display: flex;
    justify-content: space-between;
  }
  .stream {
    width:100%;
    display:flex;
    flex:auto;
    flex-direction: column;
    overflow-y:auto;
    height: 0px;
  }
  .msg {
    display:flex;
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
  .ack-count {
    display:flex;
    justify-content: center;
    margin:auto;
    width:15px;
    height:15px;
    margin-left: 5px;
    background-color: yellow;
    color: black;
    font-size: 80%;
    border-radius:50%;
  }

</style>