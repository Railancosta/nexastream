/**
 * EIP-6963 Multi Injected Provider Discovery
 * Detects ALL installed wallet extensions simultaneously (not just window.ethereum)
 */
export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP6963AnnounceProvider {
  info: EIP6963ProviderInfo;
  provider: any;
}

let providers: EIP6963AnnounceProvider[] = [];
let initialized = false;

/** Listen for EIP-6963 provider announcements */
export function initEIP6963(): Promise<EIP6963AnnounceProvider[]> {
  if (initialized) return Promise.resolve(providers);
  return new Promise((resolve) => {
    providers = [];
    const timeout = setTimeout(() => { initialized = true; resolve(providers); }, 500);

    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as EIP6963AnnounceProvider;
      if (detail?.info?.uuid && !providers.some(p => p.info.uuid === detail.info.uuid)) {
        providers.push(detail);
      }
    };

    window.addEventListener("eip6963:announceProvider", handler);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", handler);
      clearTimeout(timeout);
      initialized = true;
      resolve(providers);
    }, 500);
  });
}

/** Get all detected providers */
export function getProviders(): EIP6963AnnounceProvider[] { return providers; }

/** Get a provider by name */
export function getProviderByName(name: string): any {
  return providers.find(p => p.info.name.toLowerCase().includes(name.toLowerCase()))?.provider;
}

/** Get provider by RDNs (Reverse Domain Name) */
export function getProviderByRdns(rdns: string): any {
  return providers.find(p => p.info.rdns === rdns)?.provider;
}
