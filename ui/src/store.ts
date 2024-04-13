import {
    type AppAgentClient,
    type AgentPubKeyB64,
    type RoleName,
    encodeHashToBase64,
    type AgentPubKey,
    type ActionHash,
    type Link,
    type EntryHash,
    decodeHashFromBase64,
    type DnaHash,
  } from '@holochain/client';
import TimeAgo from "javascript-time-ago"
import en from 'javascript-time-ago/locale/en'
import type { ProfilesStore } from '@holochain-open-dev/profiles';
import { EntryRecord, LazyHoloHashMap, ZomeClient } from '@holochain-open-dev/utils';
import { collectionStore, type AsyncReadable, latestVersionOfEntryStore, pipe, joinAsync, sliceAndJoin, asyncDerived, type Writable, writable, get, type Unsubscriber } from '@holochain-open-dev/stores';
import type { ActionCommittedSignal } from '@holochain-open-dev/utils';
import { isWeContext, type WeClient } from '@lightningrodlabs/we-applet';
import { HoloHashMap } from '@holochain-open-dev/utils/dist/holo-hash-map';
import { getMyDna } from './util';
import type { UnsubscribeFunction } from 'emittery';


TimeAgo.addDefaultLocale(en)

const ZOME_NAME = 'zipzap'

export type Thing = 
{
    content: string
}
export type ThingData = 
{
    originalHash: ActionHash,
    content: string,
    record: EntryRecord<Thing>,
}
export type EntryTypes = string
  | ({ type: 'Thing' } & Thing);

export type ZipZapSignal = ActionCommittedSignal<EntryTypes, Message>;

export class ZipZapClient extends ZomeClient<ZipZapSignal> {
    constructor(public client: AppAgentClient, public roleName, public zomeName = ZOME_NAME) {
        super(client, roleName, zomeName);
    }

    async sendMessage(streamId: string, payload: Payload, agents: AgentPubKey[]) {
        await this.callZome('send_message', {
            streamId,
            content: JSON.stringify(payload), 
            agents
        })
    }

    async createThing(content) : Promise<EntryRecord<Thing>> {
        return new EntryRecord(await this.callZome('create_thing', {content}))
    }
    async updateThing(origHash: ActionHash, prevHash:ActionHash, content: string) : Promise<EntryRecord<Thing>> {
        return new EntryRecord(await this.callZome('update_thing', {
            original_thing_hash: origHash,
            previous_thing_hash: prevHash,
            updated_thing: {content}}))
    }
    async getThings() : Promise<Link[]> {
        const results = await this.callZome('get_things', undefined)
        return results
    }
    async getThing(hash: ActionHash) : Promise<EntryRecord<Thing>| undefined> {
        const record = await this.callZome('get_thing', hash)
        if (!record) return undefined;

        const def: EntryRecord<Thing> = new EntryRecord(record);
        return def
    }
}

export enum SeenType {
    Tip="t",
}

export interface UIProps {
    tips: HoloHashMap<EntryHash,EntryHash>
}

export type Msg = {
    created: number,
    text: string
}

export type Payload = 
    ({ type: 'Msg' } & Msg) |
    ({type: 'Ack'} & number)


export type Message = {
    payload: Payload;
    from: AgentPubKey;
    received: Date;
}

export class Stream {
    messages:Writable<Message[]> = writable([])
    constructor(public id : string,
    ) {

    }
    addMessage(message: Message) {
        this.messages.update((messages)=>{
            messages.push(message)
            return messages
        })
    }

}

export class ZipZapStore {
    myAgentPubKeyB64: AgentPubKeyB64
    timeAgo = new TimeAgo('en-US')
    updating = false
    client: ZipZapClient;
    thingLinks: AsyncReadable<Link[]>
    thingHashes: AsyncReadable<ActionHash[]>
    things: LazyHoloHashMap<ActionHash,AsyncReadable<ThingData>> = new LazyHoloHashMap(
        (hash: ActionHash) => {
            const latestVersion = latestVersionOfEntryStore(this.client, () =>
                this.client.getThing(hash)
            );
            const asyncThing = pipe(latestVersion,
                record => record.entry.content
                )
            return pipe(joinAsync([asyncThing, latestVersion]), ([content, record]) => {return {originalHash: hash, content,record}})
        }
    )
    thingsList: AsyncReadable<ThingData[]>
    uiProps: Writable<UIProps> 
    unsub: Unsubscriber
    dnaHash: DnaHash
    streams: {[key: string]: Stream} = {}

    addMessageToStream(streamId: string, message: Message) {
        if (isWeContext() && message.payload.type == "Msg") {
            this.weClient.notifyFrame([
                {
                    title: `message from ${encodeHashToBase64(message.from)}`,
                    body: message.payload.text,
                    notification_type: "message",
                    icon_src: undefined,
                    urgency: "medium",
                    timestamp: message.payload.created
                }
            ])
        }
        console.log("SSS", streamId, message)
        let stream = this.streams[streamId]
        if (! stream) {
            stream = new Stream(streamId)
            this.streams[streamId] = stream
        }
        stream.addMessage(message)
    }

    constructor(
        public weClient : WeClient,
        public profilesStore: ProfilesStore,
        protected clientIn: AppAgentClient,
        protected roleName: RoleName,
        protected zomeName: string = ZOME_NAME
    ) {
        this.client = new ZipZapClient(
            clientIn,
            this.roleName,
            this.zomeName
          );
        this.client.onSignal((signal)=>{
            console.log("MSG",signal)
            // @ts-ignore
            if (signal.type == "Message") {
                const message: Message = {
                    // @ts-ignore
                    payload: JSON.parse(signal.content),
                    // @ts-ignore
                    from: signal.from,
                    received: new Date
                }
                // @ts-ignore
                this.addMessageToStream(signal.stream_id, message)
            }
        })

        getMyDna(roleName, clientIn).then(res=>{
            this.dnaHash = res
          })
        this.myAgentPubKeyB64 = encodeHashToBase64(this.myAgentPubKey);

        this.thingLinks = collectionStore(
            this.client,
            () => this.client.getThings(),
            'AllThings'
          );
        this.thingHashes = asyncDerived(this.thingLinks,
            links=> links.map(link=>link.target)
        )
        this.thingsList = pipe(this.thingHashes, 
            hashes=> sliceAndJoin(this.things,hashes),
            map=>Array.from(map.values())
        )

        this.uiProps = writable({
            tips: new HoloHashMap,
        })
        for (let i = 0; i < localStorage.length; i+=1){
            const key = localStorage.key(i)
            const [type, boardHashB64, cardId] = key.split(":")
            if (type == SeenType.Tip) {
                const tipB64 = localStorage.getItem(key)
                this.setSeenTip(decodeHashFromBase64(boardHashB64), decodeHashFromBase64(tipB64))
            }
        }
    }

    updateSeenTip(boardHash: EntryHash, tip:EntryHash) {
        localStorage.setItem(`${SeenType.Tip}:${encodeHashToBase64(boardHash)}`, encodeHashToBase64(tip))
        this.setSeenTip(boardHash, tip)
    }

    setSeenTip(boardHash:EntryHash, tip: EntryHash) {
        this.uiProps.update((n) => {
            n.tips.set(boardHash,tip)
            return n
        })
    }

    setUIprops(props:{}) {
        this.uiProps.update((n) => {
            Object.keys(props).forEach(key=>n[key] = props[key])
            return n
        })
    }

   
    get myAgentPubKey(): AgentPubKey {
        return this.client.client.myPubKey;
    }

    async makeThing(content: string) : Promise<any> {
        return await this.client.createThing(content)
    }

}