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
        this.actionHistory = [];
        this.stateHistory = [];
        this.rewardHistory = [];
    }
}


export default class PolicyGradientAgent {
    // This inits the agent and declares the policy network.
    constructor(args) {
        const {actionSize, inputSize, hiddenSize, gamma} = args;

        this.actionSize = actionSize;
        this.inputSize = inputSize;
        this.hiddenSize = hiddenSize;
        this.gamma = gamma;

        this.actionHistory = [];
        this.stateHistory = [];
        this.rewardHistory = [];

        this.model = {
            stateTensor: tf.Variable({shape: [inputSize, 1], name:'state', trainable: false}),
            actionTensor: tf.Variable({shape: [actionSize, 1], name:'action', trainable: false}),
            rewardTensor: tf.Variable({shape: [1], name:'reward', trainable: false}),
            output: tf.Tensor,
            loss: this.lossFunction,
            optimizer: tf.train.adam({learningRate:0.1})
        };
    }


    init () {
        // First dense layer uses relu activation.
        const denseLayer1 = tf.layers.dense({units: this.hiddenSize, activation: 'relu'});
        // Second dense layer uses sigmoid activation.
        const outputLayer = tf.layers.dense({units: this.actionSize, activation: 'sigmoid'});
        // Obtain the output symbolic tensor by applying the layers on the input.
        this.model.output = outputLayer.apply(denseLayer1.apply(this.model.stateTensor));
    }

    lossFunction(actionTensor, rewardTensor) {
        // compute discounted returns:
        const logProbability = tf.log(actionTensor);
        // Negative Log probablity.
        return tf.mul(-1, tf.mul(logProbability, rewardTensor));
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

        this.rewardHistory.push(discountedReward);
    }
    
    // this function back-props the policy.
    update() {
        for (let step = 0; step < this.actionHistory.length; step++) {
            
            this.model.actionTensor.assign(this.actionHistory[step]);
            this.model.stateTensor.assign(this.stateHistory[step]);
            this.model.rewardTensor.assign(this.rewardHistory[step]);

            this.model.optimizer.minimize(() => this.lossFunction(this.model.actionTensor, this.model.rewardTensor));
            console.log("Loss for episode i "  + this.lossFunction(this.model.actionTensor, this.model.rewardTensor));
        }
        
        this.actionHistory = [];
        this.stateHistory = [];
        this.rewardHistory = [];

    }
}