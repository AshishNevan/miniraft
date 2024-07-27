# Minimal Raft Implementation
Implemtation of Raft consensus algorithm in JavaScript.

## How to run
1. **Environment**: Open the project in n terminal windows, where n is the number of nodes in the system. 
2. **Execution**: In each of n terminal windows, run `node index.js [n] [m]` where n is the total nodes and m is the current node id.
3. **Communication**: Upon reaching consensus, the system is ready for interaction via RESTful endpoints:
- **Execute**: `localhost:300[m]/` where m is the id of the leader, used to give new command to execute and store.
- **Retrieve**: `localhost:300[m]/log` where m can be any node, used to retrieve the current state of the system.
## Quick Demo [MacOS only]
1. Open project in terminal, set node.js 21 environment (if needed, `nvm use 21` for Node Version Manager)
2. run `./raft_demo.sh 3` to launch 3 nodes. Find out the id of current leader from launched terminal windows.
3. Use Postman or any API testing tool to issue commands and retrive state.
4. You may simulate a node failure by using the `localhost:300[m]/kill` endpoint to kill the node with id = m.


## Consensus Algorithms Overview

Consensus algorithms are protocols used in distributed systems to achieve agreement on a single data value among distributed processes or systems. This is crucial for ensuring consistency and reliability in environments where multiple nodes or machines must work together.

### Basic Concepts
- **Nodes**: Independent processes or machines that participate in the consensus.
- **Proposals**: Values that nodes suggest to be agreed upon.
- **Quorum**: The minimum number of nodes that must agree for the decision to be valid.
- **Fault Tolerance**: The ability of the system to continue functioning correctly even when some nodes fail or act maliciously.

### Common Steps in Consensus Algorithms
1. **Propose**: Nodes propose values to be agreed upon.
2. **Vote**: Nodes vote on the proposed values.
3. **Decision**: Once a quorum is reached, the decision is made.
4. **Broadcast**: The agreed-upon value is broadcast to all nodes.

### Important Properties
- **Consistency**: All nodes agree on the same value.
- **Availability**: The system can continue to operate even if some nodes fail.
- **Partition Tolerance**: The system can handle network partitions where some nodes cannot communicate.

### Applications
- **Blockchain**: Ensures all nodes in the network agree on the state of the ledger.
- **Distributed Databases**: Ensures data consistency across different nodes.
- **Fault-Tolerant Systems**: Provides reliability and availability in critical systems.
