const { network, ethers } = require("hardhat");
const { networkConfig, developmentChains } = require("../helper-hardhat-config");
const { verify } = require("../verify/verify");
require("dotenv").config();

const VRF_SUB_FUN_AMOUNT = ethers.parseEther('30');

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    
    let vrfCoordinatorV2Mock
    let vrfCoordinatorV2Address;
    let subscriptionId;

    if(chainId == 31337) {
        vrfCoordinatorV2Address = (await deployments.get("VRFCoordinatorV2Mock")).address;
        vrfCoordinatorV2Mock = await ethers.getContractAt("VRFCoordinatorV2Mock", vrfCoordinatorV2Address);
        const response = await vrfCoordinatorV2Mock.createSubscription();
        const reciept = await response.wait();
        subscriptionId = reciept.logs[0].topics[1];
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUN_AMOUNT);
    }
    else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
        subscriptionId = networkConfig[chainId]["subscriptionId"];
    }

    log("-------------------------------------------------------------------");
    const arguments = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId]["gasLane"],
        networkConfig[chainId]["keepersUpdateInterval"],
        networkConfig[chainId]["lotteryEntranceFee"],
        networkConfig[chainId]["callbackGasLimit"]
    ]

    const lottery = await deploy("Lottery", {
        from: deployer,
        args: arguments,
        log: true,
        waitConfimations: 1
    })
    log(`Lottery Contract deployed at ${lottery.address}`);

    developmentChains.includes(network.name) ? await vrfCoordinatorV2Mock.addConsumer(subscriptionId, lottery.address) : "";

    if(!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY){
        await verify(lottery.address, arguments)
    }
}

module.exports.tags = ["all", "Lottery"]