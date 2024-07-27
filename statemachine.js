const express = require("express");
const axios = require("axios");
const EventEmitter = require("events");
const baseurl = `http://localhost:300`;
const minDelay = 100;
const maxDelay = 200;

class statemachine {
  constructor(id, n) {
    // comm
    this.id = id;
    this.n = n;
    this.port = `300${id}`;
    this.validStates = { leader: 0, follower: 1, candidate: 2 };
    this.currentState = this.validStates.follower;
    this.timer = new statemachine.electionTimer();

    // persistant state
    this.currentTerm = 0;
    this.votedFor = null;
    this.log = [{ entry: {}, term: 0 }];

    // volatile state
    this.commitIndex = 0;
    this.lastApplied = 0;

    // volatile state for leader
    this.nextIndex = [];
    this.matchIndex = [];
  }
  static electionTimer = class extends EventEmitter {
    constructor() {
      super();
      this.timeoutId = null;
    }

    start(min, max) {
      this.reset(); // Ensure any existing timer is cleared before starting a new one

      // Calculate a random time between min and max (in milliseconds)
      const randomTime = Math.floor(Math.random() * (max - min + 1)) + min;

      // Set a timeout to emit the 'tick' event after the random time
      this.timeoutId = setTimeout(() => {
        this.emit("tick");
      }, randomTime);
    }

    reset(min, max) {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }

      if (min !== undefined && max !== undefined) {
        this.start(min, max);
      }
    }
  };

  async server() {
    const app = express();
    app.use(express.json());

    app.get("/ping", (req, res) => {
      res.send(200, "pong");
    });

    app.get("/log", (req, res) => {
      res.send(200, this.log);
    });

    app.post("/", async (req, res) => {
      if (req.body == null) {
        res.send(400, false);
      } else {
        this.log.push({ entry: req.body, term: this.currentTerm });
        let success = false;
        while (success != true) {
          success = await this.sendAppendEntries();
          //console.log(success);
        }
        this.lastApplied++;
        this.commitIndex++;
        res.send(200, true);
      }
    });

    app.post("/appendEntries", (req, res) => {
      if (req.body.entries.length == 0) {
        if (req.body.term >= this.currentTerm) {
          this.currentTerm = req.body.term;
          this.currentState = this.validStates.follower;
          this.timer.reset(minDelay, maxDelay);
          res.send(200, { term: this.currentTerm, success: true });
        } else {
          res.send(200, { term: this.currentTerm, success: false });
        }
      } else {
        if (req.body.term < this.currentTerm) {
          res.send(200, { term: this.currentTerm, success: false });
        } else if (
          this.log.length <= req.body.prevLogIndex ||
          (this.log.length > req.body.prevLogIndex &&
            this.log[req.body.prevLogIndex].term != req.body.prevLogTerm)
        ) {
          res.send(200, { term: this.currentTerm, success: false });
        } else {
          if (
            this.log.length > req.body.prevLogIndex &&
            this.log[req.body.prevLogIndex].entry ==
              req.body.entries[0].entry &&
            this.log[req.body.prevLogIndex].term != req.body.entries[0].term
          ) {
            this.log = this.log.slice(0, req.bod.prevLogIndex);
          } else {
            req.body.entries.forEach((x) => this.log.push(x));
          }
          if (req.body.leaderCommit > this.commitIndex) {
            this.commitIndex = Math.min(
              req.body.leaderCommit,
              this.log.length - 1,
            );
          }
          res.send(200, { term: this.currentTerm, success: true });
        }
      }
    });

    app.post("/requestVote", (req, res) => {
      let vote = false;
      if (req.body.term < this.currentTerm) {
        vote = false;
        //console.log(`${this.id} has voted false for ${req.body.candidateId}`);
      } else if (
        ((req.votedFor == null || this.votedFor == req.body.candidateId) &&
          req.body.lastLogTerm > this.currentTerm) ||
        (req.body.lastLogTerm == this.currentTerm &&
          req.body.lastLogIndex >= this.log.length - 1)
      ) {
        //console.log(`${this.id} has voted true for ${req.body.candidateId}`);
        this.currentTerm = req.body.term;
        this.votedFor = req.body.candidateId;
        vote = true;
      }
      res.send(200, { term: this.currentTerm, granted: vote });
    });

    app.listen(this.port, () => {
      //console.log(`node ${this.id} listing to http://localhost:${this.port}`);
    });
  }

  getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  ping() {
    try {
      for (i = 1; i <= this.n; i++) {
        if (i != this.id) {
          axios.get(`${baseurl}${i}/ping`);
        }
      }
    } catch (err) {
      //console.log(`${this.id} client: ping error!`);
    }
  }

  async sendVoteRequest() {
    // console.log(`${this.id} has requested for vote`);
    try {
      let votes = 1;
      let votereqs = [];
      for (i = 1; i <= this.n; i++) {
        if (i != this.id) {
          votereqs.push(
            axios.post(`${baseurl}${i}/requestVote`, {
              term: this.currentTerm,
              candidateId: this.id,
              lastLogIndex: this.log.length - 1,
              lastLogTerm: this.log[this.log.length - 1].term,
            }),
          );
        }
      }
      const voteress = await Promise.all(votereqs);
      voteress.forEach((res) => {
        if (res.data.term >= this.currentTerm) {
          this.currentTerm = res.data.term;
        }
        if (res.data.granted) {
          // console.log(`${this.id} has ${votes} votes`);
          votes++;
        }
      });
      if (votes > n / 2) {
        return true;
      } else return false;
    } catch (err) {
      //console.log(`${this.id} client: sendVoteRequest error!, ${err.message}`);
      return false;
    }
  }

  async sendAppendEntries(isHeartbeat) {
    if (isHeartbeat) {
      console.log(`${this.id} sent heartbeat`);
      try {
        let reqs = [];
        for (i = 1; i <= this.n; i++) {
          if (i != this.id) {
            reqs.push(
              axios.post(`${baseurl}${i}/appendEntries`, {
                term: this.currentTerm,
                leaderId: this.id,
                prevLogIndex: this.lastApplied,
                prevLogTerm: this.currentTerm,
                entries: [],
                leaderCommit: this.commitIndex,
              }),
            );
          }
        }
        const ress = await Promise.all(reqs);
        ress.forEach((res) => {
          if (res.data.term > this.currentTerm)
            this.currentState == this.validStates.follower;
        });
        return true;
      } catch (err) {
        //console.log(`${this.id} client: AE heartbeat error! : ${err.message}`);
      }
    } else {
      try {
        let reqs = [];
        for (i = 1; i <= this.n; i++) {
          if (i != this.id) {
            console.log(`${this.id} to ${i}`);
            //console.log(this.log.slice(this.nextIndex[i], this.log.length));
            //console.log(
            // this.lastApplied > 0 ? this.log[this.lastApplied].term : 0,
            // );
            reqs.push(
              axios.post(`${baseurl}${i}/appendEntries`, {
                term: this.currentTerm,
                leaderId: this.id,
                prevLogIndex: this.nextIndex[i] - 1,
                prevLogTerm: this.log[this.nextIndex[i] - 1].term,
                entries: this.log.slice(this.nextIndex[i], this.log.length),
                leaderCommit: this.commitIndex,
              }),
            );
          }
        }
        const ress = await Promise.all(reqs);
        let successes = 0;
        for (i = 1; i <= this.n; i++) {
          if (i != this.id) {
            const res = ress.shift();
            // console.log(`${i} sent ${res.data.success}`);
            if (res.data.success == true) {
              this.nextIndex[i]++;
              successes++;
            } else {
              let outcome = false;
              while (!outcome) {
                // console.log(`retrying for ${i}`);
                this.nextIndex[i] = this.nextIndex[i] - 1;
                const retry = await axios.post(`${baseurl}${i}/appendEntries`, {
                  term: this.currentTerm,
                  leaderId: this.id,
                  prevLogIndex: this.nextIndex[i] - 1,
                  prevLogTerm: this.log[this.nextIndex[i] - 1].term,
                  entries: this.log.slice(this.nextIndex[i], this.log.length),
                  leaderCommit: this.commitIndex,
                });
                outcome = retry.data.success;
              }
              // this.nextIndex[i] = this.log.length;
              successes++;
            }
          }
        }
        return successes > n / 2;
      } catch (err) {
        //console.log(`${this.id} client: AE error! : ${err.message}`);
      }
    }
  }

  async client() {
    this.timer.on("tick", async () => {
      await this.evaluateState();
      this.timer.reset(minDelay, maxDelay);
    });
    this.timer.start(minDelay, maxDelay);
  }

  async evaluateState() {
    if (this.currentState == this.validStates.follower) {
      //console.log(`${this.id} is follower | ${this.currentTerm}`);
      this.currentState = this.validStates.candidate;
    } else if (this.currentState == this.validStates.leader) {
      console.log(`${this.id} is leader | ${this.currentTerm}`);
      for (i = 1; i <= n; i++) this.nextIndex[i] = this.log.length;
      const randomDelay = this.getRandomDelay(minDelay / 10, maxDelay / 10);
      // setTimeout(async () => {
      const res = await this.sendAppendEntries(true);
      // }, randomDelay);
    } else if (this.currentState == this.validStates.candidate) {
      //   this.timer = new statemachine.electionTimer();
      this.currentTerm++;
      //console.log(`${this.id} is candidate | ${this.currentTerm}`);
      this.votedFor = this.id;
      this.timer.reset(minDelay, maxDelay);
      let winner = await this.sendVoteRequest();
      if (winner) {
        this.currentState = this.validStates.leader;
        for (i = 1; i <= n; i++) {
          this.nextIndex[i] = this.log.length + 1;
          this.matchIndex[i] = 0;
        }
        await this.sendAppendEntries(true);
      }
    }
  }

  main() {
    const s = this.server();
    const c = this.client();
    Promise.all[(s, c)];
  }
}

module.exports = statemachine;
