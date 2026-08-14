const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NSTToken", function () {
  let NSTToken;
  let token;
  let owner;
  let alice;
  let bob;

  const MAX_SUPPLY = ethers.parseEther("55000000");

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    NSTToken = await ethers.getContractFactory("NSTToken");
    token = await NSTToken.deploy(owner.address);
    await token.waitForDeployment();
  });

  it("has correct name, symbol, decimals", async function () {
    expect(await token.name()).to.equal("NexaStream Token");
    expect(await token.symbol()).to.equal("NST");
    expect(await token.decimals()).to.equal(18);
  });

  it("has MAX_SUPPLY of exactly 55,000,000 NST", async function () {
    expect(await token.MAX_SUPPLY()).to.equal(MAX_SUPPLY);
  });

  it("starts with zero total supply", async function () {
    expect(await token.totalSupply()).to.equal(0);
  });

  it("mints tokens up to MAX_SUPPLY", async function () {
    const amount = ethers.parseEther("1000");
    await token.mint(alice.address, amount);
    expect(await token.balanceOf(alice.address)).to.equal(amount);
    expect(await token.totalSupply()).to.equal(amount);
  });

  it("reverts when minting exceeds MAX_SUPPLY (invariant)", async function () {
    await expect(token.mint(alice.address, MAX_SUPPLY + 1n)).to.be.revertedWith(
      "NST: exceeds max supply",
    );
  });

  it("can mint exactly MAX_SUPPLY (boundary)", async function () {
    await token.mint(alice.address, MAX_SUPPLY);
    expect(await token.totalSupply()).to.equal(MAX_SUPPLY);
  });

  it("reverts on mint after finalizeMinting", async function () {
    await token.finalizeMinting();
    await expect(token.mint(alice.address, 1)).to.be.revertedWith("NST: minting finalized");
  });

  it("only owner can mint", async function () {
    await expect(token.connect(alice).mint(bob.address, 1)).to.be.revertedWith(
      "NST: not owner",
    );
  });

  it("transfers tokens between accounts", async function () {
    await token.mint(owner.address, ethers.parseEther("1000"));
    await token.transfer(alice.address, ethers.parseEther("400"));
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("400"));
    expect(await token.balanceOf(owner.address)).to.equal(ethers.parseEther("600"));
  });

  it("reverts transfer with insufficient balance", async function () {
    await token.mint(owner.address, ethers.parseEther("100"));
    await expect(
      token.transfer(alice.address, ethers.parseEther("101")),
    ).to.be.revertedWith("NST: insufficient balance");
  });

  it("approves and transfers via allowance", async function () {
    await token.mint(owner.address, ethers.parseEther("1000"));
    await token.approve(alice.address, ethers.parseEther("300"));
    expect(await token.allowance(owner.address, alice.address)).to.equal(
      ethers.parseEther("300"),
    );
    await token.connect(alice).transferFrom(owner.address, bob.address, ethers.parseEther("300"));
    expect(await token.balanceOf(bob.address)).to.equal(ethers.parseEther("300"));
  });

  it("reverts transferFrom with insufficient allowance", async function () {
    await token.mint(owner.address, ethers.parseEther("1000"));
    await expect(
      token.connect(alice).transferFrom(owner.address, bob.address, ethers.parseEther("1")),
    ).to.be.revertedWith("NST: insufficient allowance");
  });

  it("emits Transfer event on mint", async function () {
    const amount = ethers.parseEther("500");
    await expect(token.mint(alice.address, amount))
      .to.emit(token, "Transfer")
      .withArgs(ethers.ZeroAddress, alice.address, amount);
  });

  it("transfers ownership", async function () {
    await token.transferOwnership(alice.address);
    expect(await token.owner()).to.equal(alice.address);
  });

  it("rejects zero address as owner in constructor", async function () {
    await expect(NSTToken.deploy(ethers.ZeroAddress)).to.be.revertedWith(
      "NST: zero owner",
    );
  });
});
