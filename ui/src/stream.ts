import { HoloHashMap } from "@holochain-open-dev/utils";
import type { AgentPubKey } from "@holochain/client";
import { writable, type Readable, type Writable, derived } from "svelte/store";

export type Msg = {
    created: number,
    text: string
}

export type Payload = 
    ({ type: 'Msg' } & Msg) |
    ({type: 'Ack'} & {created:number})


export type Message = {
    payload: Payload;
    from: AgentPubKey;
    received: number;
}

export class Stream {
    store:Writable<Message[]> = writable([])
    messages:Readable<Message[]>
    acks:Writable<{[key: number]:HoloHashMap<AgentPubKey,boolean>}> = writable({})
    constructor(public id : string,
    ) {
        this.messages = derived(this.store,s=>s.sort((a,b)=>a.received - b.received))
    }
    addMessage(message: Message) {
        if (message.payload.type == "Ack") {
            this.acks.update((acks)=>{
                let ack = acks[message.payload.created]
                if (!ack) {
                    ack = new HoloHashMap()
                    acks[message.payload.created] = ack
                }
                ack.set(message.from,true)
                return acks
            })
        } else if (message.payload.type == "Msg") {
            console.log("Adding Message", message)
            this.store.update((messages)=>{
                messages.push(message)
                return messages
            })
        }
    }

}