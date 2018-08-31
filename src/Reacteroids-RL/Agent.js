import * as tf from '@tensorflow/tfjs';


export class RandomAgent {
    // This inits the agent and declares the policy network.
    constructor(args) {
        this.actionSize = 3;
        this.inputSize = 4+4;
        this.actionHistory = [];
        this.stateHistory = [];
        this.rewardHistory = [];
    }

    init () {
        
    }

    // This runs the model and evaluates the model policy. 
    evaluatePolicy(stateVec) {
        const policy = [Math.random(), Math.random(), Math.random()];
        const action = this.getAction(policy);

        this.actionHistory.push(action);
        this.stateHistory.push(stateVec);
        
        return action
    }

    getAction(policy) {
        let actions = [];
        for (let i = 0; i < policy.length; i++) {
            if (policy[i] > 0.5) {
                actions.push(1);
            } else {
                actions.push(0);
            }
        }
        return actions
    }

    // this function stores the reward, action, state combinations that
    // can be used for backpropagation. 
    saveReturns(reward) {
        this.rewardHistory.push(reward);
    }
    
    // this function back-props the policy.
    update() {
        console.log(this.actionHistory);
        console.log(this.stateHistory);
        console.log(this.rewardHistory);

        this.actionHistory = [];
        this.stateHistory = [];
        this.rewardHistory = [];
    }
}


export default class PolicyGradientAgent {
    // This inits the agent and declares the policy network.
    constructor(args) {
        this.actionSize = 3;
        this.inputSize = 19;
        this.hiddenSize = 36;
        this.gamma = 0.9;
        this.learning_rate = 0.1;

        this.actionHistory = [];
        this.stateHistory = [];
        this.rewardHistory = [];

    }

    init () {
        // Define input, which has a size of 5 (not including batch dimension).
        const input = tf.input({shape: [this.inputSize], name:'state'});

        // First dense layer uses relu activation.
        const denseLayer1 = tf.layers.dense({units: this.hiddenSize, activation: 'relu'});
        // Second dense layer uses softmax activation.
        const outputLayer = tf.layers.dense({units: this.actionSize, activation: 'sigmoid'});

        // Obtain the output symbolic tensor by applying the layers on the input.
        const output = outputLayer.apply(denseLayer1.apply(input));

        // Create the model based on the inputs.
        this.model = tf.model({inputs: input, outputs: output});

        this.model.compile({loss: this.lossFunction, optimizer: 'adam'});
        console.log(this.model.summary())
    }

    lossFunction (target, output) {
        return tf.mean(tf.neg(tf.log(output)).mul(target[0]))
    }

    // This runs the model and evaluates the model policy. 
    evaluatePolicy(stateVec) {

        let policy = this.model.predict(tf.tensor([stateVec])).dataSync();

        const action = this.getAction(policy);

        this.actionHistory.push(action);
        this.stateHistory.push(stateVec);
        
        return action
    }

    getAction(policy) {
        let actions = [];
        for (let i = 0; i < policy.length; i++) {
            if (policy[i] > 0.5) {
                actions.push(1);
            } else {
                actions.push(0);
            }
        }
        return actions
    }

    // this function stores the reward, action, state combinations that
    // can be used for backpropagation. 
    saveReturns(reward) {
        const lastReward = this.rewardHistory[-1];
        const discountedReward = lastReward*this.gamma + reward

        this.rewardHistory.push([discountedReward,discountedReward,discountedReward]);
    }
    
    // this function back-props the policy.
    update() {
        let states = tf.tensor(this.stateHistory);
        let rewards = tf.tensor(this.rewardHistory);

        const history = this.model.fit(states, 
            rewards,
        {
            batchSize: this.stateHistory.length,
            epochs: 1
        });

        console.log("Loss after Epoch "  + history);
        
        this.actionHistory = [];
        this.stateHistory = [];
        this.rewardHistory = [];

    }
}