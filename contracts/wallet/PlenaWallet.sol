//SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "hardhat/console.sol";

//This is just a test contract for testing proxy calls without any signature verification.
//This is used only for testing. Don't deposit funds on mainnet. Use it only for testing by forking mainnet.

contract PlenaWallet {

    /**
        @dev function in charge of executing an action
     */
    function executeCall(address[] calldata targets, bytes[] calldata datas, uint256[] memory values) external
    {
      require(targets.length == datas.length, "Incorrect Call Structure");
      bool success;
        for (uint256 i = 0; i < targets.length; i++) {
            (success,) = targets[i].call{ value: values[i] }(datas[i]);
            require(success, "Call Failed");
        }
    }

    /// @dev accept ETH deposits
    receive() external payable {}
}
