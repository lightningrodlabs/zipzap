import { type AppClient, type EntryHash, type DnaHash, CellType } from "@holochain/client";
import { readable } from "svelte/store";

export type WALUrl = string

export const hashEqual = (a:EntryHash, b:EntryHash) : boolean => {
  if (!a || !b) {
    return !a && !b
  }
  for (let i = a.length; -1 < i; i -= 1) {
    if ((a[i] !== b[i])) return false;
  }
  return true;
}

export const getMyDna = async (role:string, client: AppClient) : Promise<DnaHash>  => {
  const appInfo = await client.appInfo();
  const dnaHash = (appInfo.cell_info[role][0] as any)[
    CellType.Provisioned
  ].cell_id[0];
  return dnaHash
} 

export const isActive = (lastSeen, hash) => {
  const seen = lastSeen.get(hash)
  if (!seen) return false
  return Date.now()-seen < 11000
}

export const time = readable(Date.now(), function start(set) {
	const interval = setInterval(() => {
		set(Date.now());
	}, 1000);

	return function stop() {
		clearInterval(interval);
	};
});