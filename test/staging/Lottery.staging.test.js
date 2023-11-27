const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
const { expect, assert } = require("chai");

developmentChains.includes(network.name) ? describe.skip :
describe("Lottery Staging Testing", function () {
    let lotteryAddress, lottery, entranceFee, deployer;

    beforeEach(async () => {
        lotteryAddress = (await deployments.get("Lottery")).address;
        lottery = await ethers.getContractAt("Lottery", lotteryAddress);

        entranceFee = await lottery.getEntranceFee();
        await lottery.setLotteryState(0);
    })

    describe("fulfillRandomWords", function () {
        it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async () => {
            console.log("setting up test...");
            
            const accounts = await ethers.getSigners();
            const startingTimeStamp = await lottery.getLastTimeStamp();
            let startingBalance;

            await new Promise(async (resolve, reject) => {
                console.log("setting up Listener...");
                lottery.once("WinnerPicked", async () => {
                    console.log("WinnerPicked event fired!");
                    try {
                        const recentWinner = await lottery.getRecentWinner();
                        const lotteryState = await lottery.getLotteryState();
                        const endingTimeStamp = await lottery.getLastTimeStamp();
                        const endingBalance = await ethers.provider.getBalance(accounts[0].address);

                        await expect(lottery.getPlayer(0)).to.be.reverted
                        assert.equal(recentWinner.toString(), accounts[0].address)
                        assert.equal(lotteryState, 0)
                        assert.equal(Number(endingBalance), Number(startingBalance) + Number(entranceFee))
                        assert(endingTimeStamp > startingTimeStamp)

                        resolve();
                    } catch (error) {
                        console.log(error);
                        reject(error);
                    }
                })

                console.log("Entering the Lottery...");
                console.log((await lottery.getLotteryState()).toString())
                // await expect(lottery.enterLottery({ value: entranceFee })).to.be.revertedWithCustomError(lottery, "sendMore");
                const tx = await lottery.enterLottery({ from: accounts[0], value: entranceFee });
                await tx.wait();
                console.log("Entered the lottery! time to wait...");
                startingBalance = await ethers.provider.getBalance(accounts[0].address);
                // const tx1 = await lottery.performUpkeep("0x");
                // await tx1.wait();
                // assert(tx1);

            })
        })
    })
})