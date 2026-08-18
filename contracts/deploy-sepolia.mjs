import solc from 'solc';
import { Wallet, JsonRpcProvider, ContractFactory } from 'ethers';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('./NSTRegistry.sol', import.meta.url), 'utf8');
const out = JSON.parse(solc.compile(JSON.stringify({
  language: 'Solidity',
  sources: { 'NSTRegistry.sol': { content: src } },
  settings: { outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } }
})));
if (out.errors) for (const e of out.errors) if (e.severity === 'error') { console.error(e.formattedMessage); process.exit(1); }
const c = out.contracts['NSTRegistry.sol']['NSTRegistry'];
const wallet = new Wallet(process.env.PRIVKEY, new JsonRpcProvider('https://rpc.sepolia.org'));
const contract = await new ContractFactory(c.abi, '0x' + c.evm.bytecode.object, wallet).deploy();
await contract.waitForDeployment();
console.log('✅ NSTRegistry (testnet Sepolia) em:', await contract.getAddress());
