const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name) ? describe.skip :
describe("Lottery", function() {

    let deployer, enteranceFee, interval;
    let lotteryAddress, lottery, vrfCoordinatorV2MockAddress, vrfCoordinatorV2Mock;
    const chainId = network.config.chainId;

    beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);

        lotteryAddress = (await deployments.get("Lottery")).address;
        lottery = await ethers.getContractAt("Lottery", lotteryAddress);

        vrfCoordinatorV2MockAddress = (await deployments.get("VRFCoordinatorV2Mock")).address;
        vrfCoordinatorV2Mock = await ethers.getContractAt("VRFCoordinatorV2Mock", vrfCoordinatorV2MockAddress);

        enteranceFee = await lottery.getEntranceFee();
        interval = await lottery.getInterval();
    })

    describe("constructor", function() {
        it("sets the interval Correctaly", async () => {
            assert.equal(interval, networkConfig[chainId]["keepersUpdateInterval"]);
        })
        
        it("sets the enterance fee correctaly", async () => {
            assert.equal(enteranceFee, networkConfig[chainId]["lotteryEntranceFee"]);
        })

        it("sets the Lottery state to OPEN", async () => {
            assert.equal((await lottery.getLotteryState()).toString(), "0");
        })

        it("sets the callbackGasLimit correctaly", async () => {
            assert.equal((await lottery.getCallbackGasLimit()).toString(), networkConfig[chainId]["callbackGasLimit"]);
        })
    })

    describe("enterLottery", function() {
        it("revert if you don't pay enough", async () => {
            await expect(lottery.enterLottery()).to.be.revertedWithCustomError(lottery, "sendMore");
        })

        it("record the players address on entering", async () => {
            await lottery.enterLottery({ value: enteranceFee });
            const player = await lottery.getPlayer(0);
            assert.equal(player, deployer);
        })

        it("emits the LotterEnter event on enetring", async () => {
            await expect(lottery.enterLottery({ value: enteranceFee })).to.emit(lottery, "LotterEnter");

        })

        it("Doesn't allow enetrance when Lottery winner is calculating", async () => {
            await lottery.enterLottery({ value: enteranceFee });

            await network.provider.send("evm_increaseTime", [Number(interval)+1]);
            await network.provider.request({ method: "evm_mine", params: [] });

            await lottery.performUpkeep("0x");

            await expect(lottery.enterLottery({ value: enteranceFee })).to.be.revertedWithCustomError(lottery, "LotteryNotOpen");
        })
    })

    describe("checkUpkeep", function() {
        it("return false, if people don't send ETH", async () => {
            await network.provider.send("evm_increaseTime", [Number(interval)+1]);
            await network.provider.request({ method: "evm_mine", params: [] });

            const { upKeepNeeded } = await lottery.checkUpkeep('0x');
            assert(!upKeepNeeded);
        })

        it("return false if lottery is not OPEN", async () => {
            await lottery.enterLottery({ value: enteranceFee });

            await network.provider.send("evm_increaseTime", [Number(interval)+1]);
            await network.provider.request({ method: "evm_mine", params: [] });

            await lottery.performUpkeep("0x");

            const lotteryState = await lottery.getLotteryState();
            const { upKeepNeeded } = await lottery.checkUpkeep("0x");

            assert.equal(lotteryState.toString()=="1", upKeepNeeded==false);
        })

        it("return false, if required time interval doesn't pass", async () => {
            await lottery.enterLottery({ value: enteranceFee });

            await network.provider.send("evm_increaseTime", [Number(interval)-5]);
            await network.provider.request({ method: "evm_mine", params: [] });

            const { upKeepNeeded } = await lottery.checkUpkeep("0x");

            assert(!upKeepNeeded);
        })

        it("return true, if lottery is open, time interval passed, has players, and has balance", async () => {
            await lottery.enterLottery({ value: enteranceFee });

            await network.provider.send("evm_increaseTime", [Number(interval)+1]);
            await network.provider.request({ method: "evm_mine", params: [] });

            const { upKeepNeeded } = await lottery.checkUpkeep("0x");

            assert(upKeepNeeded);
        })
    })

    describe("performUpkeep", function() {
        it("can only run if checkUpkeep is true", async () => {
            await lottery.enterLottery({ value: enteranceFee });

            await network.provider.send("evm_increaseTime", [Number(interval)+1]);
            await network.provider.request({ method: "evm_mine", params: [] });

            const tx = await lottery.performUpkeep("0x");

            assert(tx);
        })

        // it("revert UpKeepNotNeeded if checkUpkeep is false", async () => {
        //     await expect(lottery.performUpkeep("0x")).to.be.revertedWithCustomError(lottery, "UpKeepNotNeeded");
        // })

        it("updates lotteryState and emits the RequestedLotteryWinner event", async () => {
            await lottery.enterLottery({ value: enteranceFee });

            await network.provider.send("evm_increaseTime", [Number(interval)+1]);
            await network.provider.request({ method: "evm_mine", params: [] });

            const tx = await lottery.performUpkeep("0x");
            const txReciept = await tx.wait(1);
            const lotteryState = await lottery.getLotteryState();

            const requestId = txReciept.logs[1].topics[0];
            
            assert.equal(lotteryState.toString(), "1");
            assert(Number(requestId) > 0);
        })
    })

    describe("fulfillRandomWords", function () {
        beforeEach(async () => {
            await lottery.enterLottery({ value: enteranceFee });

            await network.provider.send("evm_increaseTime", [Number(interval)+1]);
            await network.provider.request({ method: "evm_mine", params: [] });
        })

        it("should only be called after performUpkeep", async () => {
            await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, lotteryAddress)).to.be.revertedWith("nonexistent request");
            await expect(vrfCoordinatorV2Mock.fulfillRandomWords(1, lotteryAddress)).to.be.revertedWith("nonexistent request");
        })

        it("picks a winner, reset, send money", async () => {
            const newPlayers = 3;
            const accounts = await ethers.getSigners();
            let startingBalance;
            for(let i=1; i<=3; i++){
                lottery = await lottery.connect(accounts[i]);
                await lottery.enterLottery({ value: enteranceFee });
            }

            const startingTimeStamp = await lottery.getLastTimeStamp();

            await new Promise(async (resolve, reject) => {
                lottery.once("WinnerPicked", async () => {
                    console.log("Winner picked!");

                    try {
                        const recentWinner = await lottery.getRecentWinner();
                        const lotteryState = await lottery.getLotteryState();
                        const endingTimeStamp = await lottery.getLastTimeStamp();
                        const winnerBalance = await ethers.provider.getBalance(accounts[1].address);

                        assert.equal(recentWinner.toString(), accounts[1].address);
                        assert.equal(lotteryState, 0);
                        assert(endingTimeStamp > startingTimeStamp);
                        assert.equal(winnerBalance.toString(), Number(startingBalance) + ((Number(enteranceFee) * newPlayers) + Number(enteranceFee)))
                        
                        resolve();
                    }
                    catch (error) {
                        reject(error);
                    }
                })
                try {
                    const tx  = await lottery.performUpkeep("0x");
                    const txReciept = await tx.wait(1);
                    startingBalance = await ethers.provider.getBalance(accounts[1].address);
                    await vrfCoordinatorV2Mock.fulfillRandomWords(txReciept.logs[1].topics[1], lotteryAddress); 
                } catch (error) {
                    reject(error);
                }
            })
        })
    })

    describe("setLotteryState", function () {
        it("Open the Lottery", async () => {
            await lottery.setLotteryState(0);
            assert.equal((await lottery.getLotteryState()).toString(), "0");
        })

        it("Close the Lottery", async () => {
            await lottery.setLotteryState(1);
            assert.equal((await lottery.getLotteryState()).toString(), "1");
        })
    })
})