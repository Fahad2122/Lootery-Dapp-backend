const { ethers } = require("hardhat");

const networkConfig = {
    31337: {
        name: "hardhat",
        subscriptionId: "588",
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        keepersUpdateInterval: "30",
        lotteryEntranceFee: ethers.parseEther('0.01'),
        callbackGasLimit: "500000",
    },
    11155111: {
        name: "sepoila",
        vrfCoordinatorV2: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
        subscriptionId: "6893",
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        keepersUpdateInterval: "32",
        lotteryEntranceFee: ethers.parseEther('0.01'),
        callbackGasLimit: "500000"
    }
}

const developmentChains = ["hardhat", "localhost"];

const frontEndContractFile = "../frontend-lottery/src/constants/contractAddresses.json";
const frontEndAbiFile = "../frontend-lottery/src/constants/abi.json"

module.exports = {
    networkConfig,
    developmentChains,
    frontEndContractFile,
    frontEndAbiFile
}