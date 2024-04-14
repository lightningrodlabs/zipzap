<script lang="ts">
    import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';

    const handleKeydown = (e) => {
        if (e.key === "Escape") {
            dialog.hide()
        }
    }
    let dialog
    export const open = ()=>{dialog.show()}
</script>

<svelte:window on:keydown={handleKeydown}/>

<sl-dialog label="ZipZap!: UI v0.1.0 for DNA v0.1.x" bind:this={dialog} width={600} >
    <div class="about">
        <p>ZipZap! is a demonstration Holochain app built by the Lightningrod Labs  .</p>
        <p> <b>Developers:</b>
            Check out this hApp's source-code <a href="https://github.com/lightningrodlabs/zipzap">in our github repo</a>.
        </p>
    <p class="small">Copyright © 2024 Lighningrod Labs & Holochain Foundation.  This software is distributed under the MIT License</p>
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
</style>
  