const PlenaWallet = artifacts.require("PlenaWallet");
const expect = require("chai");
const IERC20 = artifacts.require("IERC20");
const swaprouterabi = require("./swaprouter.json")
const hre = require("hardhat");
const { AlphaRouter, SwapType } = require("@uniswap/smart-order-router");
const {
  Token,
  CurrencyAmount,
  TradeType,
  Percent,
} = require("@uniswap/sdk-core");
const { JSBI, BigInt } = require("jsbi");

const USDT = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const USDC_HOLDER = "0x443173a5440eeCB6960D6d73FD3C3D8a87E368f3";
const AAVE_V3_POOL_POLYGON = "0x794a61358D6845594F94dc1DB02A252b5b4814aD";
const chainId = 137; //for polygon
Provider = new hre.ethers.providers.JsonRpcProvider('http://127.0.0.1:8545/')
const router = new AlphaRouter({ chainId: chainId, provider: Provider });
//Token info on polygon
const nameUSDC = "USD Coin";
const symbolUSDC = "USDC";
const decimalsUSDC = 6;
const addressUSDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

const nameUSDT = "Tether USD";
const symbolUSDT = "USDT";
const decimalsUSDT = 6;
const addressUSDT = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const tokenUSDC = new Token(
    chainId,
    addressUSDC,
    decimalsUSDC,
    symbolUSDC,
    nameUSDC
  );
  const tokenUSDT = new Token(
    chainId,
    addressUSDT,
    decimalsUSDT,
    symbolUSDT,
    nameUSDT
  );

contract("PlenaConnectTest", ([]) => {
  let wallet, usdc, erc20Contract, aaveContract, swaproutercontract, executecontract;

  before(async function () {
    // Impersonate USDT Holder
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [USDC_HOLDER],
    });

    //aave v3 pool abi
    const aaveABI = [
      {
        inputs: [
          {
            internalType: "address",
            name: "asset",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "onBehalfOf",
            type: "address",
          },
          {
            internalType: "uint16",
            name: "referralCode",
            type: "uint16",
          },
        ],
        name: "supply",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
    ];

    //erc 20 abi
    const erc20ABI = [
      {
        inputs: [
          {
            internalType: "address",
            name: "spender",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "value",
            type: "uint256",
          },
        ],
        name: "approve",
        outputs: [
          {
            internalType: "bool",
            name: "",
            type: "bool",
          },
        ],
        stateMutability: "nonpayable",
        type: "function",
      },
    ];

    
    let executeAbi = [
        {
        constant: false,
        inputs: [
          {
            internalType: "address[]",
            name: "targets",
            type: "address[]",
          },
          {
            internalType: "bytes[]",
            name: "datas",
            type: "bytes[]",
          },
        ],
        name: "execute",
        outputs: [],
        stateMutability: "payable",
        type: "function",
      }];

    //Contract instances
    erc20Contract = new ethers.utils.Interface(erc20ABI);
    aaveContract = new ethers.utils.Interface(aaveABI);
    swaproutercontract = new ethers.utils.Interface(swaprouterabi);

    //Creating a new Plena Wallet instance
    wallet = await PlenaWallet.new();

    usdc = await IERC20.at(addressUSDC);
    usdt = await IERC20.at(addressUSDT)

    //Transfer 10 USDT to Plena Wallet
    await usdc.transfer(wallet.address, "10000000", { from: USDC_HOLDER });
  });

  it("should swap USDC TO USDT", async function () {
    const wei = ethers.utils.parseUnits("10", 6);
    const inputAmount = CurrencyAmount.fromRawAmount(tokenUSDC, BigInt(wei));
    var route = await router.route(inputAmount, tokenUSDT, TradeType.EXACT_INPUT, {
        type: SwapType.SWAP_ROUTER_02,
        recipient: wallet.address,
        slippageTolerance: new Percent(50, 100),
        deadline: Math.floor(Date.now() / 1000 + 1800),
      });
    console.log(`amount is: ${route.quote.toFixed(6)}`);
    //Encode Function Data for Approve
    const approvalAmount = hre.ethers.utils.parseUnits("11", 6).toString();
    const approveData = erc20Contract.encodeFunctionData("approve", [
      '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
      approvalAmount,
    ]);
    // console.log("approveData", approveData);

    var balance = await usdc.balanceOf(wallet.address);
    console.log(`balance of USDC is ${balance}`);
    balance = await usdt.balanceOf(wallet.address);
    console.log(`balance of USDT is ${balance}`)
    //Draft Transaction
    const tx = await wallet.executeCall(
      [addressUSDC, '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'], //Smart Contract Addresses On which the transactions has to be made
      [approveData, route.methodParameters.calldata], //Encoded data for all transactions in order of execution

      ["0", "0"], //Native Token Amounts required in transaction
      {
        gas: web3.utils.toHex(5e6),
        value: '0',
      }
    );
    balance = await usdc.balanceOf(wallet.address);
    console.log(`new balance of USDC is ${balance}`)
    balance = await usdt.balanceOf(wallet.address);
    console.log(`new balance of USDT is ${balance}`)
  });
});
