const { frontEndContractFile, frontEndAbiFile } = require("../helper-hardhat-config");
const fs = require("fs");
const { deployments, network, ethers } = require("hardhat");
require("dotenv").config();

module.exports = async () => {
    if(process.env.UPDATE_FRONT_END){
        console.log("Writng to frontend...");
        await updateContractAddress();
        await updateAbi();
        console.log("Write to frontend successfully");
    }
}

async function updateAbi() {
    const lotteryArtifact = await artifacts.readArtifact("Lottery");

    // Check if abi is defined and not empty
    if (lotteryArtifact && lotteryArtifact.abi && lotteryArtifact.abi.length > 0) {
        // Use the ABI directly without JSON.stringify
        fs.writeFileSync(frontEndAbiFile, JSON.stringify(lotteryArtifact.abi));
        console.log("Write to frontend successful");
    } else {
        console.error("Error: ABI is undefined, empty, or does not have a valid structure.");
    }
}

async function updateContractAddress() {
    const lotteryAddress = (await deployments.get("Lottery")).address;
    let addresses= {};
    try {
        const content = fs.readFileSync(frontEndContractFile, "utf-8");
        if(content.trim() !== ''){
            addresses = JSON.parse(content);
        }

        const chainId = network.config.chainId.toString();
        if(chainId in addresses){
            if(!addresses[chainId].includes(lotteryAddress)){
                addresses[chainId] = lotteryAddress;
            }
        }
        else {
            addresses[chainId] = [lotteryAddress];
        }

        fs.writeFileSync(frontEndContractFile, JSON.stringify(addresses));

    } catch (error) {
        console.log(error);
    }
}