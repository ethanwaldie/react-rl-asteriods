import React, { Component } from 'react';
import Ship from './Ship';
import Asteroid from './Asteroid';
import { randomNumBetweenExcluding } from './helpers';
import PolicyGradientAgent from './Agent';


const KEY = {
  LEFT:  37,
  RIGHT: 39,
  UP: 38,
  A: 65,
  D: 68,
  W: 87,
  SPACE: 32
};

const ACTIONSPACE = {
  0: (action) =>  (action === 1)? {key: 'up', value: 1}: {key: 'up', value: 0},
  1: (action) => (action === 1)? {key: 'left', value: 1}: {key: 'right', value: 1},
  2: (action) => (action === 1)? {key: 'space', value: 1}: {key: 'space', value: 0},
}

const NEAREST_ASTEROIDS = 3;

export class Reacteroids extends Component {
  constructor() {
    super();
    this.state = {
      screen: {
        width: window.innerWidth,
        height: window.innerHeight,
        ratio: window.devicePixelRatio || 1,
      },
      context: null,
      keys : {
        left  : 0,
        right : 0,
        up    : 0,
        down  : 0,
        space : 0,
      },
      asteroidCount: 3,
      currentScore: 0,
      lastScore: 0,
      reward:0,
      epochs:0,
      inGame: false,
      autoMode: true,
    }
    this.ship = [];
    this.asteroids = [];
    this.bullets = [];
    this.particles = [];
    this.agent = new PolicyGradientAgent({
      actionSize:3, 
      inputSize:19, 
      hiddenSize:36, 
      gamma:0.99
    });
    this.deathPenalty = 1000;
  }

  handleResize(value, e){
    this.setState({
      screen : {
        width: window.innerWidth,
        height: window.innerHeight,
        ratio: window.devicePixelRatio || 1,
      }
    });
  }

  handleKeys(value, e){
    if (!this.state.autoMode) {
      let keys = this.state.keys;
      if(e.keyCode === KEY.LEFT   || e.keyCode === KEY.A) keys.left  = value;
      if(e.keyCode === KEY.RIGHT  || e.keyCode === KEY.D) keys.right = value;
      if(e.keyCode === KEY.UP     || e.keyCode === KEY.W) keys.up    = value;
      if(e.keyCode === KEY.SPACE) keys.space = value;
      this.setState({
        keys : keys
      });
    }
  }

  componentDidMount() {
    window.addEventListener('keyup',   this.handleKeys.bind(this, false));
    window.addEventListener('keydown', this.handleKeys.bind(this, true));
    window.addEventListener('resize',  this.handleResize.bind(this, false));

    const context = this.refs.canvas.getContext('2d');
    this.setState({ context: context });
    
    this.agent.init();

    this.startGame();
    requestAnimationFrame(() => {this.update()});
  }

  componentWillUnmount() {
    window.removeEventListener('keyup', this.handleKeys);
    window.removeEventListener('keydown', this.handleKeys);
    window.removeEventListener('resize', this.handleResize);
  }

  update() {
    const context = this.state.context;
    const keys = this.state.keys;
    const ship = this.ship[0];

    context.save();
    context.scale(this.state.screen.ratio, this.state.screen.ratio);

    // Motion trail
    context.fillStyle = '#000';
    context.globalAlpha = 0.4;
    context.fillRect(0, 0, this.state.screen.width, this.state.screen.height);
    context.globalAlpha = 1;

    // Next set of asteroids
    if(!this.asteroids.length){
      let count = this.state.asteroidCount + 1;
      this.setState({ asteroidCount: count });
      this.generateAsteroids(count)
    }

    if (ship) {
      const asteriodStates = this.computeNormalizedAsteriodStates(ship, this.asteroids, this.state);
      this.drawDistanceLines(ship, asteriodStates, this.state.context);

      this.getAction(asteriodStates, ship)
    }

    // Check for collisions
    this.checkCollisionsWith(this.bullets, this.asteroids);
    this.checkCollisionsWith(this.ship, this.asteroids);

    // Remove or render
    this.updateObjects(this.particles, 'particles');
    this.updateObjects(this.asteroids, 'asteroids');
    this.updateObjects(this.bullets, 'bullets');
    this.updateObjects(this.ship, 'ship');

    if (this.state.inGame) {
      const currentScore = this.state.currentScore += 1
      this.agent.saveReturns(currentScore-this.state.lastScore);
      const lastScore = currentScore;
      this.setState({currentScore, lastScore});
    }
    context.restore();

    // Next frame
    requestAnimationFrame(() => {this.update()});
  }

  getAction(asteriodStates, ship) {
    const stateVector = this.buildStateVector(asteriodStates, ship);
    const actions = this.agent.evaluatePolicy(stateVector);

    let keys =  {
      left  : 0,
      right : 0,
      up    : 0,
      down  : 0,
      space : 0,
    }
    
    for (let i = 0; i < actions.length; i++) {
      const actionObj = ACTIONSPACE[i](actions[i])
      keys[actionObj.key] = actionObj.value
    }
    this.setState({ keys })
  }

  buildStateVector(asteriodStates, ship) {
    let stateVec = []
    
    //asteroid info
    for (let i = 0; i < NEAREST_ASTEROIDS; i ++) {
      if (i < asteriodStates.length) {
        const asteriod = asteriodStates[i]

        stateVec.push(...[asteriod.distance, 
                          asteriod.angle, 
                          asteriod.relativeVelocity,
                          asteriod.velocityAngle,
                          asteriod.item.score]);
      } else {
        stateVec.push(...[0,0,0,0,0])
      }
    }

    const shipKinematics = ship.normalizedKinematics()
    // ship info
    stateVec.push(...[
      ship.rotation,
      (ship.canShoot())? 1:0,
      shipKinematics.velocity, 
      shipKinematics.velocityAngle])
    
    return stateVec
  }

  addScore(points){
    if(this.state.inGame){
      this.setState({
        currentScore: this.state.currentScore + points,
      });
    }
  }

  startGame(){
    this.setState({
      inGame: true,
      currentScore: 0,
      lastScore: 0
    });
    this.ship = [];
    this.asteroids = [];
    this.bullets = [];
    this.particles = [];

    // Make ship
    let ship = new Ship({
      position: {
        x: this.state.screen.width/2,
        y: this.state.screen.height/2
      },
      create: this.createObject.bind(this),
      onDie: this.gameOver.bind(this)
    });
    this.createObject(ship, 'ship');

    this.generateAsteroids(this.state.asteroidCount)
  }

  gameOver(){

    const finalScore = this.state.currentScore - this.deathPenalty;
    const epochs = this.state.epochs + 1

    this.setState({
      currentScore: finalScore,
      epochs
    });

    this.agent.saveReturns(finalScore);
    this.agent.update();

    this.startGame();
  }

  generateAsteroids(howMany){
    let asteroids = [];
    let ship = this.ship[0];
    for (let i = 0; i < howMany; i++) {
      let asteroid = new Asteroid({
        size: 80,
        position: {
          x: randomNumBetweenExcluding(0, this.state.screen.width, ship.position.x-60, ship.position.x+60),
          y: randomNumBetweenExcluding(0, this.state.screen.height, ship.position.y-60, ship.position.y+60)
        },
        create: this.createObject.bind(this),
        addScore: this.addScore.bind(this)
      });
      this.createObject(asteroid, 'asteroids');
    }
  }

  createObject(item, group){
    this[group].push(item);
  }

  updateObjects(items, group){
    let index = 0;
    for (let item of items) {
      if (item.delete) {
        this[group].splice(index, 1);
      }else{
        items[index].render(this.state);
      }
      index++;
    }
  }

  computeNormalizedAsteriodStates(target, items, state) {
    let states = [];

    for (let item of items) {
        const dx = (target.position.x - item.position.x)/state.screen.width;
        const dy = (target.position.y - item.position.y)/state.screen.height;

        const dvx = (target.velocity.x - item.velocity.x)/(target.terminalVelocity + item.terminalVelocity);
        const dvy = (target.velocity.y - item.velocity.y)/(target.terminalVelocity + item.terminalVelocity);


        const distance = Math.sqrt((dx**2 + dy**2));
        const angle = Math.tanh(dx,dy);
        const relativeVelocity = Math.sqrt((dvx**2 + dvy**2));
        const velocityAngle = Math.tanh(dvx,dvy);
        
        states.push({ distance, angle, relativeVelocity, velocityAngle, item });
    }
    states.sort((a,b) => a.distance > b.distance);
    return states
  }

  drawDistanceLines(target, distances, context) {
    context.save();
    context.translate(target.position.x, target.position.y);
    context.strokeStyle = '#42f442';
    context.lineWidth = 2;
    context.beginPath();

    for (let i = 0; i < NEAREST_ASTEROIDS; i++) {
      const item = distances[i].item
      const dx = item.position.x - target.position.x
      const dy = item.position.y- target.position.y
      context.moveTo(0, 0);
      context.lineTo(dx, dy);
    }

    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  }

  checkCollisionsWith(items1, items2) {
    var a = items1.length - 1;
    var b;
    for(a; a > -1; --a){
      b = items2.length - 1;
      for(b; b > -1; --b){
        var item1 = items1[a];
        var item2 = items2[b];
        if(this.checkCollision(item1, item2)){
          item1.destroy();
          item2.destroy();
        }
      }
    }
  }

  checkCollision(obj1, obj2){
    var vx = obj1.position.x - obj2.position.x;
    var vy = obj1.position.y - obj2.position.y;
    var length = Math.sqrt(vx * vx + vy * vy);
    if(length < obj1.radius + obj2.radius){
      return true;
    }
    return false;
  }

  render() {
    let endgame;
    let message;

    if (this.state.currentScore <= 0) {
      message = '0 points... So sad.';
    } else if (this.state.currentScore >= this.state.topScore){
      message = 'Top score with ' + this.state.currentScore + ' points. Woo!';
    } else {
      message = this.state.currentScore + ' Points though :)'
    }

    if(!this.state.inGame){
      endgame = (
        <div className="endgame">
          <p>Game over, man!</p>
          <p>{message}</p>
          <button
            onClick={ this.startGame.bind(this) }>
            try again?
          </button>
        </div>
      )
    }

    return (
      <div>
        { endgame }
        <span className="score current-score" >Score: {this.state.currentScore}</span>
        <span className="score top-score" > Epochs: {this.state.epochs}</span>
        <span className="controls" >
          Use [A][S][W][D] or [←][↑][↓][→] to MOVE<br/>
          Use [SPACE] to SHOOT
        </span>
        <canvas ref="canvas"
          width={this.state.screen.width * this.state.screen.ratio}
          height={this.state.screen.height * this.state.screen.ratio}
        />
      </div>
    );
  }
}
