import { describe, it, expect, beforeEach } from "vitest";
import { stringAsciiCV, stringUtf8CV, uintCV, listCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_PETITION_NOT_FOUND = 101;
const ERR_PETITION_CLOSED = 102;
const ERR_INVALID_INPUT = 103;
const ERR_INVALID_TITLE = 104;
const ERR_INVALID_DESCRIPTION = 105;
const ERR_INVALID_TARGET = 106;
const ERR_INVALID_DEADLINE = 107;
const ERR_PETITION_ALREADY_EXISTS = 108;
const ERR_INVALID_STATUS = 109;
const ERR_UPDATE_NOT_ALLOWED = 110;
const ERR_INVALID_UPDATE_PARAM = 111;
const ERR_MAX_PETITIONS_EXCEEDED = 112;
const ERR_INVALID_CATEGORY = 113;
const ERR_INVALID_PRIORITY = 114;
const ERR_INVALID_LOCATION = 115;
const ERR_INVALID_TAGS = 116;
const ERR_AUTHORITY_NOT_SET = 117;
const ERR_INVALID_TIMESTAMP = 118;
const ERR_INVALID_MIN_SIGNATURES = 119;
const ERR_INVALID_MAX_EXTENSION = 120;

interface Petition {
  creator: string;
  title: string;
  description: string;
  targetSignatures: number;
  currentSignatures: number;
  deadline: number;
  isActive: boolean;
  category: string;
  priority: number;
  location: string;
  tags: string[];
  timestamp: number;
  status: string;
  minSignatures: number;
  maxExtension: number;
}

interface PetitionUpdate {
  updateTitle: string;
  updateDescription: string;
  updateTarget: number;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class PetitionCoreMock {
  state: {
    petitionCounter: number;
    maxPetitions: number;
    creationFee: number;
    authorityContract: string | null;
    petitions: Map<number, Petition>;
    petitionUpdates: Map<number, PetitionUpdate>;
    petitionsByTitle: Map<string, number>;
  } = {
    petitionCounter: 0,
    maxPetitions: 10000,
    creationFee: 500,
    authorityContract: null,
    petitions: new Map(),
    petitionUpdates: new Map(),
    petitionsByTitle: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      petitionCounter: 0,
      maxPetitions: 10000,
      creationFee: 500,
      authorityContract: null,
      petitions: new Map(),
      petitionUpdates: new Map(),
      petitionsByTitle: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxTransfers = [];
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setCreationFee(newFee: number): Result<boolean> {
    if (newFee < 0) return { ok: false, value: false };
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.creationFee = newFee;
    return { ok: true, value: true };
  }

  setMaxPetitions(newMax: number): Result<boolean> {
    if (newMax <= 0) return { ok: false, value: false };
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.maxPetitions = newMax;
    return { ok: true, value: true };
  }

  createPetition(
    title: string,
    description: string,
    targetSignatures: number,
    deadline: number,
    category: string,
    priority: number,
    location: string,
    tags: string[],
    minSignatures: number,
    maxExtension: number
  ): Result<number> {
    if (this.state.petitionCounter >= this.state.maxPetitions) return { ok: false, value: ERR_MAX_PETITIONS_EXCEEDED };
    if (!title || title.length > 100) return { ok: false, value: ERR_INVALID_TITLE };
    if (!description || description.length > 500) return { ok: false, value: ERR_INVALID_DESCRIPTION };
    if (targetSignatures <= 0) return { ok: false, value: ERR_INVALID_TARGET };
    if (deadline <= this.blockHeight) return { ok: false, value: ERR_INVALID_DEADLINE };
    if (!["policy", "environment", "social"].includes(category)) return { ok: false, value: ERR_INVALID_CATEGORY };
    if (priority > 10) return { ok: false, value: ERR_INVALID_PRIORITY };
    if (location.length > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (tags.length > 10) return { ok: false, value: ERR_INVALID_TAGS };
    if (minSignatures <= 0) return { ok: false, value: ERR_INVALID_MIN_SIGNATURES };
    if (maxExtension > 30) return { ok: false, value: ERR_INVALID_MAX_EXTENSION };
    if (this.state.petitionsByTitle.has(title)) return { ok: false, value: ERR_PETITION_ALREADY_EXISTS };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_SET };

    this.stxTransfers.push({ amount: this.state.creationFee, from: this.caller, to: this.state.authorityContract });

    const id = this.state.petitionCounter;
    const petition: Petition = {
      creator: this.caller,
      title,
      description,
      targetSignatures,
      currentSignatures: 0,
      deadline,
      isActive: true,
      category,
      priority,
      location,
      tags,
      timestamp: this.blockHeight,
      status: "open",
      minSignatures,
      maxExtension,
    };
    this.state.petitions.set(id, petition);
    this.state.petitionsByTitle.set(title, id);
    this.state.petitionCounter++;
    return { ok: true, value: id };
  }

  getPetition(id: number): Petition | null {
    return this.state.petitions.get(id) || null;
  }

  updatePetition(id: number, updateTitle: string, updateDescription: string, updateTarget: number): Result<boolean> {
    const petition = this.state.petitions.get(id);
    if (!petition) return { ok: false, value: false };
    if (petition.creator !== this.caller) return { ok: false, value: false };
    if (!petition.isActive) return { ok: false, value: false };
    if (!updateTitle || updateTitle.length > 100) return { ok: false, value: false };
    if (!updateDescription || updateDescription.length > 500) return { ok: false, value: false };
    if (updateTarget <= 0) return { ok: false, value: false };
    if (this.state.petitionsByTitle.has(updateTitle) && this.state.petitionsByTitle.get(updateTitle) !== id) {
      return { ok: false, value: false };
    }

    const updated: Petition = {
      ...petition,
      title: updateTitle,
      description: updateDescription,
      targetSignatures: updateTarget,
      timestamp: this.blockHeight,
    };
    this.state.petitions.set(id, updated);
    this.state.petitionsByTitle.delete(petition.title);
    this.state.petitionsByTitle.set(updateTitle, id);
    this.state.petitionUpdates.set(id, {
      updateTitle,
      updateDescription,
      updateTarget,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  closePetition(id: number): Result<boolean> {
    const petition = this.state.petitions.get(id);
    if (!petition) return { ok: false, value: false };
    if (petition.creator !== this.caller) return { ok: false, value: false };
    if (!petition.isActive) return { ok: false, value: false };
    const updated: Petition = {
      ...petition,
      isActive: false,
      status: "closed",
    };
    this.state.petitions.set(id, updated);
    return { ok: true, value: true };
  }

  incrementSignatures(id: number, amount: number): Result<boolean> {
    const petition = this.state.petitions.get(id);
    if (!petition) return { ok: false, value: false };
    if (!petition.isActive) return { ok: false, value: false };
    if (petition.currentSignatures + amount > petition.targetSignatures) return { ok: false, value: false };
    const updated: Petition = {
      ...petition,
      currentSignatures: petition.currentSignatures + amount,
    };
    this.state.petitions.set(id, updated);
    return { ok: true, value: true };
  }

  getPetitionCount(): Result<number> {
    return { ok: true, value: this.state.petitionCounter };
  }

  checkPetitionExistence(title: string): Result<boolean> {
    return { ok: true, value: this.state.petitionsByTitle.has(title) };
  }
}

describe("PetitionCore", () => {
  let contract: PetitionCoreMock;

  beforeEach(() => {
    contract = new PetitionCoreMock();
    contract.reset();
  });

  it("creates a petition successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createPetition(
      "Test Title",
      "Test Description",
      100,
      1000,
      "policy",
      5,
      "Test Location",
      ["tag1", "tag2"],
      10,
      15
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const petition = contract.getPetition(0);
    expect(petition?.title).toBe("Test Title");
    expect(petition?.description).toBe("Test Description");
    expect(petition?.targetSignatures).toBe(100);
    expect(petition?.currentSignatures).toBe(0);
    expect(petition?.deadline).toBe(1000);
    expect(petition?.isActive).toBe(true);
    expect(petition?.category).toBe("policy");
    expect(petition?.priority).toBe(5);
    expect(petition?.location).toBe("Test Location");
    expect(petition?.tags).toEqual(["tag1", "tag2"]);
    expect(petition?.status).toBe("open");
    expect(petition?.minSignatures).toBe(10);
    expect(petition?.maxExtension).toBe(15);
    expect(contract.stxTransfers).toEqual([{ amount: 500, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects duplicate petition titles", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPetition(
      "Test Title",
      "Test Description",
      100,
      1000,
      "policy",
      5,
      "Test Location",
      ["tag1"],
      10,
      15
    );
    const result = contract.createPetition(
      "Test Title",
      "New Description",
      200,
      2000,
      "environment",
      6,
      "New Location",
      ["tag3"],
      20,
      20
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_PETITION_ALREADY_EXISTS);
  });

  it("rejects petition creation without authority contract", () => {
    const result = contract.createPetition(
      "NoAuth",
      "Description",
      100,
      1000,
      "policy",
      5,
      "Location",
      ["tag"],
      10,
      15
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_SET);
  });

  it("rejects invalid title", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createPetition(
      "",
      "Description",
      100,
      1000,
      "policy",
      5,
      "Location",
      ["tag"],
      10,
      15
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_TITLE);
  });

  it("rejects invalid category", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createPetition(
      "Title",
      "Description",
      100,
      1000,
      "invalid",
      5,
      "Location",
      ["tag"],
      10,
      15
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_CATEGORY);
  });

  it("updates a petition successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPetition(
      "Old Title",
      "Old Description",
      100,
      1000,
      "policy",
      5,
      "Location",
      ["tag"],
      10,
      15
    );
    const result = contract.updatePetition(0, "New Title", "New Description", 200);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const petition = contract.getPetition(0);
    expect(petition?.title).toBe("New Title");
    expect(petition?.description).toBe("New Description");
    expect(petition?.targetSignatures).toBe(200);
    const update = contract.state.petitionUpdates.get(0);
    expect(update?.updateTitle).toBe("New Title");
    expect(update?.updateDescription).toBe("New Description");
    expect(update?.updateTarget).toBe(200);
    expect(update?.updater).toBe("ST1TEST");
  });

  it("rejects update for non-existent petition", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.updatePetition(99, "New Title", "New Description", 200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update by non-creator", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPetition(
      "Title",
      "Description",
      100,
      1000,
      "policy",
      5,
      "Location",
      ["tag"],
      10,
      15
    );
    contract.caller = "ST3FAKE";
    const result = contract.updatePetition(0, "New Title", "New Description", 200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("closes a petition successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPetition(
      "Title",
      "Description",
      100,
      1000,
      "policy",
      5,
      "Location",
      ["tag"],
      10,
      15
    );
    const result = contract.closePetition(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const petition = contract.getPetition(0);
    expect(petition?.isActive).toBe(false);
    expect(petition?.status).toBe("closed");
  });

  it("increments signatures successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPetition(
      "Title",
      "Description",
      100,
      1000,
      "policy",
      5,
      "Location",
      ["tag"],
      10,
      15
    );
    const result = contract.incrementSignatures(0, 50);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const petition = contract.getPetition(0);
    expect(petition?.currentSignatures).toBe(50);
  });

  it("rejects increment beyond target", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPetition(
      "Title",
      "Description",
      100,
      1000,
      "policy",
      5,
      "Location",
      ["tag"],
      10,
      15
    );
    const result = contract.incrementSignatures(0, 150);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets creation fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setCreationFee(1000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.creationFee).toBe(1000);
  });

  it("returns correct petition count", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPetition(
      "Title1",
      "Desc1",
      100,
      1000,
      "policy",
      5,
      "Loc1",
      ["tag1"],
      10,
      15
    );
    contract.createPetition(
      "Title2",
      "Desc2",
      200,
      2000,
      "environment",
      6,
      "Loc2",
      ["tag2"],
      20,
      20
    );
    const result = contract.getPetitionCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks petition existence correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPetition(
      "Test Title",
      "Test Description",
      100,
      1000,
      "policy",
      5,
      "Test Location",
      ["tag1", "tag2"],
      10,
      15
    );
    const result = contract.checkPetitionExistence("Test Title");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const result2 = contract.checkPetitionExistence("NonExistent");
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("rejects petition creation with max petitions exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.setMaxPetitions(1);
    contract.createPetition(
      "Title1",
      "Desc1",
      100,
      1000,
      "policy",
      5,
      "Loc1",
      ["tag1"],
      10,
      15
    );
    const result = contract.createPetition(
      "Title2",
      "Desc2",
      200,
      2000,
      "environment",
      6,
      "Loc2",
      ["tag2"],
      20,
      20
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_PETITIONS_EXCEEDED);
  });

  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.authorityContract).toBe("ST2TEST");
  });

  it("rejects invalid authority contract", () => {
    const result = contract.setAuthorityContract("SP000000000000000000002Q6VF78");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
});