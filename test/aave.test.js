const PlenaWallet = artifacts.require("PlenaWallet");
const expect = require("chai");
const IERC20 = artifacts.require("IERC20");
const hre = require("hardhat");

const USDT = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const USDT_HOLDER = "0xF977814e90dA44bFA03b6295A0616a897441aceC";
const AAVE_V3_POOL_POLYGON = "0x794a61358D6845594F94dc1DB02A252b5b4814aD";

contract("PlenaConnectTest", ([]) => {
  let wallet, usdt, erc20Contract, aaveContract;

  before(async function () {
    // Impersonate USDT Holder
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [USDT_HOLDER],
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

    //Contract instances
    erc20Contract = new ethers.utils.Interface(erc20ABI);
    aaveContract = new ethers.utils.Interface(aaveABI);

    //Creating a new Plena Wallet instance
    wallet = await PlenaWallet.new();

    usdt = await IERC20.at(USDT);

    //Transfer 10 USDT to Plena Wallet
    await usdt.transfer(wallet.address, "10000000", { from: USDT_HOLDER });
  });

  it("should deposit 10 USDT to AAVE", async function () {
    //Encode Function Data for Approve
    const approveData = erc20Contract.encodeFunctionData("approve", [
      AAVE_V3_POOL_POLYGON,
      "10000000",
    ]);

    console.log("approveData", approveData);

    //Encode Function Data for Lend
    const lendData = aaveContract.encodeFunctionData("supply", [
      USDT,
      "10000000",
      wallet.address,
      0,
    ]);

    console.log("lendData", lendData);

    let executeAbi = {
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
    };

    //Draft Transaction

    const tx = await wallet.executeCall(
      [USDT, AAVE_V3_POOL_POLYGON], //Smart Contract Addresses On which the transactions has to be made
      [approveData, lendData], //Encoded data for all transactions in order of execution

      ["0", "0"], //Native Token Amounts required in transaction
      {
        gas: web3.utils.toHex(5e6),
        value: 0,
      }
    );
  });

  it("should fail to deposit 10 USDT to AAVE if approveal amount is less ", async function () {
    const approveData = erc20Contract.encodeFunctionData("approve", [
      AAVE_V3_POOL_POLYGON,
      "100000",
    ]);

    console.log("approveData", approveData);

    //Encode Function Data for supply
    // AAve V3 Pool is supplied with 10 USDT
    const lendData = aaveContract.encodeFunctionData("supply", [
      USDT,
      "10000000",
      wallet.address,
      0,
    ]);

    console.log("lendData", lendData);

    let executeAbi = {
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
    };

    //Draft Transaction

    const tx = await wallet.executeCall(
      [USDT, AAVE_V3_POOL_POLYGON], //Smart Contract Addresses On which the transactions has to be made
      [approveData, lendData], //Encoded data for all transactions in order of execution
      ["0", "0"], //Native Token Amounts required in transaction
      {
        gas: web3.utils.toHex(5e6),
        value: 0,
      }
    );

    // transaction is reverted since the approval amount is less than the amount to be deposited
    expect(tx).to.be.reverted();
  });
});
