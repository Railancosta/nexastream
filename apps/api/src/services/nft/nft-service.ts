import { randomUUID, createHash } from "node:crypto";

export interface VideoNFT {
  id: string;
  tokenId: number;
  videoHash: string;
  title: string;
  creator: string;
  mintedAt: number;
  owner: string;
  transferCount: number;
  metadata: {
    duration?: number;
    resolution?: string;
    codec?: string;
    size?: number;
  };
}

/**
 * NFT service — mints videos as NFTs on the NexaStream chain.
 * Each video can be minted as a unique NFT, tradeable on the platform.
 *
 * Rule 48: no hidden mint functions. All mints are transparent.
 */
export class NftService {
  private readonly nfts = new Map<string, VideoNFT>();
  private readonly hashIndex = new Map<string, string>(); // videoHash -> nftId
  private nextTokenId = 1;

  mint(input: {
    videoHash: string;
    title: string;
    creator: string;
    metadata?: VideoNFT["metadata"];
  }): VideoNFT {
    // Prevent double-minting of the same content.
    if (this.hashIndex.has(input.videoHash)) {
      throw new Error("video already minted as NFT");
    }

    const nft: VideoNFT = {
      id: randomUUID(),
      tokenId: this.nextTokenId++,
      videoHash: input.videoHash,
      title: input.title.slice(0, 200),
      creator: input.creator,
      mintedAt: Date.now(),
      owner: input.creator,
      transferCount: 0,
      metadata: input.metadata || {},
    };

    this.nfts.set(nft.id, nft);
    this.hashIndex.set(input.videoHash, nft.id);
    return nft;
  }

  transfer(nftId: string, from: string, to: string): VideoNFT {
    const nft = this.nfts.get(nftId);
    if (!nft) throw new Error("NFT not found");
    if (nft.owner !== from) throw new Error("not owner");
    if (!to) throw new Error("invalid recipient");
    nft.owner = to;
    nft.transferCount++;
    return nft;
  }

  getNft(id: string): VideoNFT | undefined { return this.nfts.get(id); }
  getNftByVideoHash(hash: string): VideoNFT | undefined {
    const id = this.hashIndex.get(hash);
    return id ? this.nfts.get(id) : undefined;
  }
  getNftsByOwner(owner: string): VideoNFT[] {
    return Array.from(this.nfts.values()).filter(n => n.owner === owner);
  }
  getNftsByCreator(creator: string): VideoNFT[] {
    return Array.from(this.nfts.values()).filter(n => n.creator === creator);
  }
  getTotalMinted(): number { return this.nfts.size; }
}
