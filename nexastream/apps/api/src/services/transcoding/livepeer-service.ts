/**
 * Livepeer API integration — transcoding for adaptive streaming (HLS/DASH).
 * Generates multiple resolutions (240p, 360p, 480p, 720p, 1080p) from
 * uploaded videos.
 *
 * Architecture (rule 98, 99):
 * - Original master file stored on IPFS (backup, censorship-resistant)
 * - Transcoded HLS segments distributed via P2P (WebTorrent)
 * - Metadata stored on VPS (PostgreSQL)
 */
export interface LivepeerConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface TranscodeJob {
  id: string;
  status: "preparing" | "processing" | "ready" | "failed";
  inputUrl: string;
  outputs: TranscodeOutput[];
  createdAt: number;
  completedAt?: number;
}

export interface TranscodeOutput {
  resolution: string;
  bitrate: number;
  fps: number;
  hlsPlaylistUrl?: string;
  segmentCount?: number;
}

const RESOLUTIONS = [
  { resolution: "240p", bitrate: 400000, fps: 30, height: 240 },
  { resolution: "360p", bitrate: 800000, fps: 30, height: 360 },
  { resolution: "480p", bitrate: 1600000, fps: 30, height: 480 },
  { resolution: "720p", bitrate: 3000000, fps: 30, height: 720 },
  { resolution: "1080p", bitrate: 5000000, fps: 30, height: 1080 },
];

export class LivepeerService {
  private readonly config: Required<LivepeerConfig>;

  constructor(config: LivepeerConfig) {
    if (!config.apiKey) throw new Error("Livepeer API key required");
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || "https://livepeer.studio/api",
    };
  }

  /**
   * Create a transcode job from an IPFS URL.
   * Generates HLS segments in multiple resolutions.
   */
  async createTranscodeJob(inputUrl: string, profile?: string[]): Promise<TranscodeJob> {
    const profiles = profile && profile.length > 0
      ? RESOLUTIONS.filter(r => profile.includes(r.resolution))
      : RESOLUTIONS;

    const res = await fetch(`${this.config.baseUrl}/task`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "transcode",
        input: { url: inputUrl },
        outputs: {
          hls: {
            profiles: profiles.map(p => ({
              width: Math.round(p.height * 16 / 9),
              height: p.height,
              bitrate: p.bitrate,
              fps: p.fps,
              name: p.resolution,
            })),
          },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(`Livepeer error: ${err.message || err.code}`);
    }

    const data = await res.json();
    return {
      id: data.id,
      status: "processing",
      inputUrl,
      outputs: profiles.map(p => ({
        resolution: p.resolution,
        bitrate: p.bitrate,
        fps: p.fps,
      })),
      createdAt: Date.now(),
    };
  }

  /** Get transcode job status. */
  async getJobStatus(jobId: string): Promise<TranscodeJob> {
    const res = await fetch(`${this.config.baseUrl}/task/${jobId}`, {
      headers: { "Authorization": `Bearer ${this.config.apiKey}` },
    });

    if (!res.ok) throw new Error(`Livepeer job not found: ${jobId}`);
    const data = await res.json();

    const status = data.status?.phase === "completed" ? "ready"
      : data.status?.phase === "failed" ? "failed"
      : "processing";

    const outputs: TranscodeOutput[] = (data.status?.outputs?.hls?.profiles || []).map((p: any) => ({
      resolution: p.name || "unknown",
      bitrate: p.bitrate,
      fps: p.fps,
      hlsPlaylistUrl: data.status?.outputs?.hls?.path,
      segmentCount: p.segments,
    }));

    return {
      id: data.id,
      status,
      inputUrl: data.input?.url || "",
      outputs,
      createdAt: data.createdAt ? new Date(data.createdAt).getTime() : 0,
      completedAt: status === "ready" ? Date.now() : undefined,
    };
  }

  /** Get available resolutions. */
  static getResolutions() { return RESOLUTIONS; }
}
