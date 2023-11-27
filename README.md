# Decentralized Lottery DApp - Backend

Welcome to the decentralized lottery DApp backend repository! This project leverages the power of blockchain, Ethereum, Chainlink VRF, and Chainlink automation to create a fair and transparent lottery system. Members can enter the lottery by paying a small amount of cryptocurrency, and the winner is randomly chosen using Chainlink VRF. The reward is automatically sent to the winner through Chainlink automation after a specified time period.

## Project Description

This decentralized lottery system aims to bring trust and fairness to the world of lotteries. By utilizing blockchain technology and smart contracts, participants can engage in a decentralized and transparent lottery experience.

### Features:

- **Chainlink VRF (Verifiable Random Function):** Ensures a provably fair and random selection of the lottery winner.
- **Chainlink Automation:** Automatically processes and sends the reward to the winner after a predefined time period.
- **Ethereum Blockchain:** Utilizes the Ethereum blockchain for smart contract execution and secure transactions.

## Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/Fahad2122/Lootery-Dapp-backend
   cd Lootery-Dapp-backend
   ```

2. **Installation of packges:**
    using npm
   ```bash
   npm install
   ```
   using yarn
   ```bash
   yarn install
   ```

3. **Configure Environment Variables:**
   Create a .env file and set the required environment variables. You may use the provided .env.example as a template.

## Local Development 
### Hardhat Commands

1. **Compile Smart Contracts:**
   ```bash
   hh compile
   ```

2. **Deploy Smart Contracts:**
   ```bash
   hh deploy --network [network_name]
   ```

3. **Testing Smart Contracts:**
   ```bash
   hh test --network [network_name]
   ```
### Project Structure
 - #contracts/: Contains the Ethereum smart contracts for the decentralized lottery.
 - #deploy/: Deployment scripts for deploying smart contracts.
 - #test/: Test scripts for verifying the functionality of smart contracts.

## Acknowledgments
his project was built with Hardhat for Ethereum development. Special thanks to Chainlink for providing secure and decentralized oracles for our lottery system.

Feel free to explore the code, contribute, and enhance the decentralized lottery experience!

🚀 Happy Lottery Gaming! 🎉