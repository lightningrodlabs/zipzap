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
import { type Message, Stream, type Payload } from './stream';


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
    lastSeen: Writable<HoloHashMap<AgentPubKey,number>> = writable(new HoloHashMap())

    async addMessageToStream(streamId: string, message: Message) {
        this.lastSeen.update(l=>{
            l.set(message.from,Date.now())
            return l
        })
        let stream = this.streams[streamId]
        if (! stream) {
            stream = new Stream(streamId)
            this.streams[streamId] = stream
        }
        stream.addMessage(message)
        if (message.payload.type == "Msg") {
            if (isWeContext()) {
                this.weClient.notifyFrame([
                    {
                        title: `message from :${encodeHashToBase64(message.from)}`,
                        body: message.payload.text,
                        notification_type: "message",
                        icon_src: undefined,
                        urgency: "high",
                        timestamp: message.payload.created
                    }
                ])
            }
            if (encodeHashToBase64(message.from) != this.myAgentPubKeyB64)
                await this.client.sendMessage(streamId, {type:"Ack", created:message.payload.created},[message.from])
        }
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
                // @ts-ignore
                const from: AgentPubKey = signal.from
                // @ts-ignore
                const streamId = signal.stream_id
                // @ts-ignore
                const payload: Payload = JSON.parse(signal.content)
                const message: Message = {
                    payload,
                    from,
                    received: Date.now()
                }
                this.addMessageToStream(streamId, message)
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