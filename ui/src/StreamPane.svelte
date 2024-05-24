<script lang="ts">
  import "@shoelace-style/shoelace/dist/components/button/button.js";
  import { createEventDispatcher, getContext, onMount } from "svelte";
  import { get } from "svelte/store";
  import SvgIcon from "./SvgIcon.svelte";
  import Confirm from "./Confirm.svelte";
  import { isWeContext } from "@lightningrodlabs/we-applet";
  import type { ZipZapStore } from "./store";
  import { encodeHashToBase64 } from "@holochain/client";
  import type { Stream, Payload } from "./stream";
  import type { AgentPubKey } from "@holochain/client";
  import type { HoloHashMap } from "@holochain-open-dev/utils";

  const { getStore }: any = getContext("store");
  const store: ZipZapStore = getStore();

  export let hashes: Array<AgentPubKey>;
  export let stream: Stream;

  const showFrom = stream.id == "_all" || JSON.parse(stream.id).length > 2;
  const dispatch = createEventDispatcher();

  //@ts-ignore
  $: myProfile = get(store.profilesStore.myProfile).value;

  onMount(async () => {
    // if (!myName) {
    //     editAvatarDialog.open()
    // }
  });
  $: messages = stream.messages;
  $: acks = stream.acks;
  $: lastSeen = store.lastSeen;
  $: agentActive = store.agentActive;

  let inputElement;
  let disabled;
  const sendMessage = async () => {
    const payload: Payload = {
      type: "Msg",
      text: inputElement.value,
      created: Date.now(),
    };
    await store.sendMessage(stream.id, payload, hashes);
    inputElement.value = "";
  };
  const getAckCount = (
    acks: { [key: number]: HoloHashMap<Uint8Array, boolean> },
    msgId
  ): number => {
    const ack = acks[msgId];
    if (ack) {
      return ack.size;
    }
    return 0;
  };
  let confirmDialog;
  const convertMessageText = (text: string): string => {
    let formatted = text.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a style="text-decoration: underline;" href="$1">$1</a>'
    );
    formatted = formatted.replace(
      /(we:\/\/[^\s]+)/g,
      '<a style="text-decoration: underline;" href="$1">$1</a>'
    );
    return formatted;
  };
</script>

<Confirm
  bind:this={confirmDialog}
  message="Zap this stream?"
  on:confirm-confirmed={() => {
    dispatch("zap");
  }}
></Confirm>
<div class="person-feed">
  <div class="header">
    <div>
      <span>Messages: {$messages.length}</span>
    </div>
    <div style="display:flex; align-items: center">
      {#if isWeContext()}
        <sl-button
          on:click={() => confirmDialog.open()}
          style="margin-top: 5px;margin-right: 5px"
          title="Add to Pocket"
          circle
          size="small"><SvgIcon icon="addToPocket" size="10" /></sl-button
        >
      {/if}
      <sl-button
        on:click={() => confirmDialog.open()}
        style="margin-top: 5px;margin-right: 5px"
        title="Zap"
        circle
        size="small"><SvgIcon icon="faClose" size="10" /></sl-button
      >

      <!-- {#each hashes as hash}
        {@const hb64 = encodeHashToBase64(hash)}
        <div style="margin-right:5px;margin-top:5px;"  class:person-inactive={!$agentActive || !$agentActive.get(hash)} title={`Last Seen: ${ $lastSeen.get(hash) ? new Date($lastSeen.get(hash)).toLocaleTimeString(): "never"}`} >
          <agent-avatar  disable-copy={true} size={20} agent-pub-key="{hb64}"></agent-avatar>
        </div>
      {/each} -->
    </div>
  </div>
  <div class="stream">
    {#each $messages as msg}
      {@const isMyMessage =
        encodeHashToBase64(msg.from) == store.myAgentPubKeyB64}
      <div class="msg" class:my-msg={isMyMessage}>
        {#if msg.payload.type == "Msg"}
          {#if !isMyMessage && showFrom}
            <agent-avatar
              style="margin-right:5px"
              disable-copy={true}
              size={20}
              agent-pub-key={encodeHashToBase64(msg.from)}
            ></agent-avatar>
          {/if}
          {@html convertMessageText(msg.payload.text)}
          <span
            title={`Received: ${new Date(msg.received).toLocaleTimeString()}`}
            class="msg-timestamp"
            >{new Date(msg.payload.created).toLocaleTimeString()}</span
          >
          {#if isMyMessage}
            {@const ackCount = getAckCount($acks, msg.payload.created)}
            {#if ackCount == hashes.length}
              ✓
            {:else if hashes.length > 1}
              <span class="ack-count">{ackCount}</span>
            {/if}
          {/if}
        {/if}
      </div>
    {/each}
  </div>
  <div class="send-controls">
    <sl-input
      style="width:100%"
      bind:this={inputElement}
      on:sl-input={(e) => (disabled = !e.target.value || !inputElement.value)}
      on:keydown={(e) => {
        if (e.keyCode == 13) {
          sendMessage();
          e.stopPropagation();
        }
      }}
      placeholder="Message"
    ></sl-input>

    <sl-button
      style="margin-left:10px;"
      circle
      {disabled}
      on:click={sendMessage}
      ><SvgIcon icon="zipzap" size="20" />
    </sl-button>
  </div>
</div>

<style>
  .person-feed {
    padding-left: 10px;
    display: flex;
    flex-direction: column;
    background-color: lightgoldenrodyellow;
    width: 100%;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .stream {
    width: 100%;
    display: flex;
    flex: auto;
    flex-direction: column;
    overflow-y: auto;
    height: 0px;
  }
  .msg {
    display: flex;
    margin: 5px;
    border-radius: 0px 15px 0px 15px;
    color: white;
    padding: 3px 10px;
    flex-shrink: 1;
    align-self: flex-start;
    background-color: rebeccapurple;
  }
  a {
    text-decoration: underline;
  }
  .my-msg {
    border-radius: 15px 0px 15px 0px;
    align-self: flex-end;
    background-color: blue;
  }
  .send-controls {
    display: flex;
    justify-content: flex-end;
    padding: 5px;
  }
  .msg-timestamp {
    margin-left: 4px;
    font-size: 80%;
    color: #ccc;
  }
  .ack-count {
    display: flex;
    justify-content: center;
    margin: auto;
    width: 15px;
    height: 15px;
    margin-left: 5px;
    background-color: yellow;
    color: black;
    font-size: 80%;
    border-radius: 50%;
  }
  .person-inactive {
    opacity: 0.5;
  }
</style>
