
import type { AppletHash, AppletServices, AssetInfo, RecordInfo, WAL, WeaveServices } from '@theweave/api';
import { decodeHashFromBase64, type AppClient } from '@holochain/client';
import { getMyDna } from './util';
import { ProfilesClient } from '@holochain-open-dev/profiles';
import { toPromise } from '@holochain-open-dev/stores';
import { PROFILES_CLIENT} from './util'

const ICON = '<svg width="800px" height="800px" viewBox="0 0 24 24" fill="yellow" xmlns="http://www.w3.org/2000/svg"><path d="M9 17.5H3.5M6.5 12H2M9 6.5H4M17 3L10.4036 12.235C10.1116 12.6438 9.96562 12.8481 9.97194 13.0185C9.97744 13.1669 10.0486 13.3051 10.1661 13.3958C10.3011 13.5 10.5522 13.5 11.0546 13.5H16L15 21L21.5964 11.765C21.8884 11.3562 22.0344 11.1519 22.0281 10.9815C22.0226 10.8331 21.9514 10.6949 21.8339 10.6042C21.6989 10.5 21.4478 10.5 20.9454 10.5H16L17 3Z" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'

export const appletServices: AppletServices = {
    // Types of attachment that this Applet offers for other Applets to be created
    creatables: {
      'thing': {
        label: "Thing",
        icon_src: ICON,
      }
    },
    // Types of UI widgets/blocks that this Applet supports
    blockTypes: {},
    bindAsset: async (appletClient: AppClient,
      srcWal: WAL, dstWal: WAL): Promise<void> => {
      console.log("Bind requested.  Src:", srcWal, "  Dst:", dstWal)
    },

    getAssetInfo: async (
      appletClient: AppClient,
      wal: WAL,
      recordInfo: RecordInfo,
    ): Promise<AssetInfo | undefined> => {
      if (!recordInfo) {
        let name = "Everybody"
        if (wal.context !== "_all") {
          const members = JSON.parse(wal.context)
          const names = []
          if (PROFILES_CLIENT) {
            for (const m of members) {
              const key = decodeHashFromBase64(m)
              const profile = await PROFILES_CLIENT.getAgentProfile(key)
              names.push(profile.entry.nickname)
            }
          } else {
              names.push(`${members.length} member stream`)
          }
          name = `${names.join(", ")}`
        }
        return {
          icon_src: `data:image/svg+xml;utf8,${ICON}`,
          name,
        };
      }
      else {
        return {
          icon_src: `data:image/svg+xml;utf8,${ICON}`,
          name: "thing",
        };
      }
    },
    search: async (
      appletClient: AppClient,
      appletHash: AppletHash,
      weServices: WeaveServices,
      searchFilter: string
    ): Promise<Array<WAL>> => {
      return []
    },
};