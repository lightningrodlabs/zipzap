<script lang="ts">
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
  import { APP_VERSION } from './util';

    const handleKeydown = (e) => {
        if (e.key === "Escape") {
            dialog.hide()
        }
    }
    let dialog
    export const open = ()=>{dialog.show()}
</script>

<svelte:window on:keydown={handleKeydown}/>

<sl-dialog label="ZipZap!" bind:this={dialog} width={600} >
    <div class="about">
        <p>ZipZap is ephemeral chat.  Your messages are never stored.  Chat streams are defined by the people who are in them.
        </p>
        <!-- svelte-ignore missing-declaration -->
        <p><b>Version:</b> UI {__APP_VERSION__}; DNA {__DNA_VERSION__}</p>
        <p> <b>Developers:</b>
            Check out this hApp's source-code <a href="https://github.com/lightningrodlabs/zipzap">in our github repo</a>.
        </p>
    <p class="small">Copyright © 2024 Lightningrod Labs & Holochain Foundation.  This software is distributed under the MIT License</p>
    </div>
</sl-dialog>

<style>
    .about {
        background-color: white;
    }
    .about p {

        margin-bottom:10px;
     }
     .small {
        font-size: 80%;
    }
    a {
        text-decoration:underline
    }

</style>
  