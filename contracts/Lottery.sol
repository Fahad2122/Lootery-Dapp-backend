// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

error sendMore();
error LotteryNotOpen();
error TransferFailed();
error UpKeepNotNeeded(uint256 currentBalance, uint256 numPlayer, uint256 lotteryState);

contract Lottery is VRFConsumerBaseV2, AutomationCompatibleInterface{

    //states
    enum LotteryState {
        OPEN,
        CALCULATING
    }

    //chainlink VRF vaiables
    VRFCoordinatorV2Interface private immutable vrfCoordinator;
    uint64 private immutable subscriptionId;
    bytes32 private immutable gasLane;
    uint32 private immutable callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    //Lottery Variables
    address payable[] private players;
    address private recentWinner;
    uint256 private immutable enteranceFee;
    LotteryState private lotteryState;
    uint256 private lastTimeStamp;
    uint256 private immutable interval;

    //Events
    event LotterEnter(address indexed player);
    event WinnerPicked(address indexed player);
    event RequestedLotteryWinner(uint256 indexed requestId);

    //contructor
    constructor(address _vrfCoordinatorV2, uint64 _subscriptionId, bytes32 _gasLane, uint256 _interval, uint256 _entranceFee, uint32 _callbackGasLimit) VRFConsumerBaseV2(_vrfCoordinatorV2) {
        vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinatorV2);
        gasLane = _gasLane;
        interval = _interval;
        subscriptionId = _subscriptionId;
        enteranceFee = _entranceFee;
        lotteryState = LotteryState.OPEN;
        lastTimeStamp = block.timestamp;
        callbackGasLimit = _callbackGasLimit;
    }

    //Functions
    function enterLottery() public payable {
        if(msg.value < enteranceFee){
            revert sendMore();
        }
        if(lotteryState != LotteryState.OPEN){
            revert LotteryNotOpen();
        }
        players.push(payable(msg.sender));

        emit LotterEnter(msg.sender);
    }

    function checkUpkeep(bytes memory /*checkData*/) public view override returns (bool upKeepNeeded, bytes memory /*performedData*/) {
        bool isOpen = lotteryState == LotteryState.OPEN;
        bool timePassed = (block.timestamp - lastTimeStamp) > interval;
        bool hasPlayers = players.length > 0;
        bool hasBalance = address(this).balance > 0;

        upKeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
        return (upKeepNeeded, "0x0");
    }

    function performUpkeep(bytes calldata /*performedData*/) external override {
        // (bool upKeepNeeded, ) = checkUpkeep("");
        // if(!upKeepNeeded){
        //     revert UpKeepNotNeeded(address(this).balance, players.length, uint256(lotteryState));
        // }

        lotteryState = LotteryState.CALCULATING;
        uint256 requestId = vrfCoordinator.requestRandomWords(
            gasLane,
            subscriptionId,
            REQUEST_CONFIRMATIONS,
            callbackGasLimit,
            NUM_WORDS
        );

        emit RequestedLotteryWinner(requestId);
    }

    function fulfillRandomWords(uint256 /*_requestId*/, uint256[] memory _randomWords) internal override {
        uint256 index = _randomWords[0] % players.length;
        address payable winner = players[index];
        recentWinner = winner;
        players = new address payable[](0);
        lotteryState = LotteryState.OPEN;
        lastTimeStamp = block.timestamp;
        (bool success, ) =  winner.call{ value: address(this).balance }("");
        
        if(!success){
            revert TransferFailed();
        }

        emit WinnerPicked(winner);
    }

    function setLotteryState(uint256 _state) public {
        lotteryState = LotteryState(_state);
    }

    // View/Pure Functions
    function getLotteryState() public view returns (LotteryState) {
        return lotteryState;
    }

    function getNumWords() public pure returns (uint32) {
        return NUM_WORDS;
    }

    function getResquestConfirmations() public pure returns (uint16) {
        return REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint256) {
        return interval;
    }

    function getRecentWinner() public view returns (address) {
        return recentWinner;
    }

    function getPlayer(uint256 _index) public view returns (address) {
        return players[_index];
    }

    function getEntranceFee() public view returns (uint256) {
        return enteranceFee;
    }

    function getLastTimeStamp() public view returns (uint256) {
        return lastTimeStamp;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return players.length;
    }

    function getCallbackGasLimit() public view returns (uint256) {
        return callbackGasLimit;
    }

}