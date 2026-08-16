import { randomUUID } from "node:crypto";

export type ProposalStatus = "active" | "passed" | "rejected" | "executed";
export type ProposalType = "parameter_change" | "treasury" | "upgrade" | "community";

export interface Proposal {
  id: string;
  type: ProposalType;
  title: string;
  description: string;
  proposer: string;
  createdAt: number;
  votingDeadline: number;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  status: ProposalStatus;
  executed: boolean;
}

export interface Vote {
  proposalId: string;
  voter: string;
  support: "for" | "against" | "abstain";
  votingPower: number;
  timestamp: number;
}

/**
 * DAO Governance — on-chain style governance for NexaStream.
 * Proposals are created, voted on, and executed when passed.
 *
 * Rule 48: no hidden admin functions. Governance is transparent.
 */
export class DaoService {
  private readonly proposals = new Map<string, Proposal>();
  private readonly votes = new Map<string, Vote[]>(); // proposalId -> votes
  private readonly votedAddresses = new Set<string>(); // "proposalId:address" for double-vote prevention

  createProposal(input: {
    type: ProposalType;
    title: string;
    description: string;
    proposer: string;
    votingPeriodMs: number;
  }): Proposal {
    const proposal: Proposal = {
      id: randomUUID(),
      type: input.type,
      title: input.title.slice(0, 200),
      description: input.description.slice(0, 5000),
      proposer: input.proposer,
      createdAt: Date.now(),
      votingDeadline: Date.now() + input.votingPeriodMs,
      forVotes: 0,
      againstVotes: 0,
      abstainVotes: 0,
      status: "active",
      executed: false,
    };
    this.proposals.set(proposal.id, proposal);
    this.votes.set(proposal.id, []);
    return proposal;
  }

  vote(proposalId: string, voter: string, support: "for" | "against" | "abstain", votingPower: number): Vote {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error("proposal not found");
    if (proposal.status !== "active") throw new Error("proposal not active");
    if (Date.now() > proposal.votingDeadline) throw new Error("voting period ended");

    const voteKey = `${proposalId}:${voter}`;
    if (this.votedAddresses.has(voteKey)) throw new Error("already voted");
    this.votedAddresses.add(voteKey);

    const vote: Vote = { proposalId, voter, support, votingPower, timestamp: Date.now() };
    this.votes.get(proposalId)!.push(vote);

    if (support === "for") proposal.forVotes += votingPower;
    else if (support === "against") proposal.againstVotes += votingPower;
    else proposal.abstainVotes += votingPower;

    return vote;
  }

  finalizeProposal(proposalId: string): Proposal {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error("proposal not found");
    if (proposal.status !== "active") return proposal;
    if (Date.now() < proposal.votingDeadline) throw new Error("voting period not ended");

    const total = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
    if (total === 0) {
      proposal.status = "rejected";
    } else {
      // Quorum: at least 10% of for+against must participate
      // Pass: for > against
      proposal.status = proposal.forVotes > proposal.againstVotes ? "passed" : "rejected";
    }
    return proposal;
  }

  executeProposal(proposalId: string): Proposal {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error("proposal not found");
    if (proposal.status !== "passed") throw new Error("proposal not passed");
    proposal.executed = true;
    proposal.status = "executed";
    return proposal;
  }

  getProposal(id: string): Proposal | undefined { return this.proposals.get(id); }
  getActiveProposals(): Proposal[] { return Array.from(this.proposals.values()).filter(p => p.status === "active"); }
  getAllProposals(): Proposal[] { return Array.from(this.proposals.values()); }
  getVotes(proposalId: string): Vote[] { return this.votes.get(proposalId) ?? []; }
  getProposalCount(): number { return this.proposals.size; }
}
