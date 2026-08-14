import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  role: string;
  createdAt: Date;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findByUsername(username: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(email: string, username: string, passwordHash: string): Promise<UserRecord>;
}

export class DuplicateUserError extends Error {
  constructor(field: string) {
    super(`user already exists: ${field}`);
    this.name = "DuplicateUserError";
  }
}

/**
 * User service. Passwords are hashed with bcrypt (cost 12). Never stored
 * in plaintext. Never logged.
 */
export class UserService {
  private readonly users = new Map<string, UserRecord & { passwordHash: string }>();
  private readonly emailIndex = new Map<string, string>();
  private readonly usernameIndex = new Map<string, string>();

  async register(email: string, username: string, password: string): Promise<UserRecord> {
    if (this.emailIndex.has(email.toLowerCase())) {
      throw new DuplicateUserError("email");
    }
    if (this.usernameIndex.has(username.toLowerCase())) {
      throw new DuplicateUserError("username");
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const id = randomUUID();
    const record: UserRecord & { passwordHash: string } = {
      id,
      email: email.toLowerCase(),
      username,
      role: "user",
      createdAt: new Date(),
      passwordHash,
    };
    this.users.set(id, record);
    this.emailIndex.set(email.toLowerCase(), id);
    this.usernameIndex.set(username.toLowerCase(), id);
    const { passwordHash: _ph, ...publicRecord } = record;
    void _ph;
    return publicRecord;
  }

  async verify(email: string, password: string): Promise<UserRecord> {
    const id = this.emailIndex.get(email.toLowerCase());
    if (!id) throw new InvalidCredentialsError();
    const record = this.users.get(id);
    if (!record) throw new InvalidCredentialsError();
    const valid = await bcrypt.compare(password, record.passwordHash);
    if (!valid) throw new InvalidCredentialsError();
    const { passwordHash: _ph, ...publicRecord } = record;
    void _ph;
    return publicRecord;
  }

  findById(id: string): UserRecord | null {
    const record = this.users.get(id);
    if (!record) return null;
    const { passwordHash: _ph, ...publicRecord } = record;
    void _ph;
    return publicRecord;
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("invalid credentials");
    this.name = "InvalidCredentialsError";
  }
}
