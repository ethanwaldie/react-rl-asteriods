import React, { Component } from 'react'

import Ship from './Reacteroids/Ship'


const KEY = {
    LEFT:  37,
    RIGHT: 39,
    UP: 38,
    A: 65,
    D: 68,
    W: 87,
    SPACE: 32
  };

class Auralux extends Component {
    constructor(props) {
        super();
        this.state = {
            keys : {
                left  : 0,
                right : 0,
                up    : 0,
                down  : 0,
                space : 0,
              },
            screen: {
            width: window.innerWidth,
            height: window.innerHeight,
            ratio: window.devicePixelRatio || 1,
            },
            context: null,
        }
        this.ship = []
        this.ship = [];
        this.asteroids = [];
        this.bullets = [];
        this.particles = [];
    }

    componentDidMount() {
        window.addEventListener('keyup',   this.handleKeys.bind(this, false))
        window.addEventListener('keydown', this.handleKeys.bind(this, true))
        window.addEventListener('resize',  this.handleResize.bind(this, false))
    
        const context = this.refs.canvas.getContext('2d')
        this.setState({ context: context })
        this.startGame()
        requestAnimationFrame(() => {this.update()})
      }
    
    componentWillUnmount() {
        window.removeEventListener('keyup', this.handleKeys)
        window.removeEventListener('keydown', this.handleKeys)
        window.removeEventListener('resize', this.handleResize)
    
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


    startGame = () => {
        // Make ship
        let ship = new Ship({
        position: {
          x: this.state.screen.width/2,
          y: this.state.screen.height/2
        },
        create: this.createObject.bind(this),
        onDie: this.gameOver.bind(this)
      })
      this.createObject(ship, 'ship');
    }

    handleKeys(value, e){
        let keys = this.state.keys;
        if(e.keyCode === KEY.LEFT   || e.keyCode === KEY.A) keys.left  = value;
        if(e.keyCode === KEY.RIGHT  || e.keyCode === KEY.D) keys.right = value;
        if(e.keyCode === KEY.UP     || e.keyCode === KEY.W) keys.up    = value;
        if(e.keyCode === KEY.SPACE) keys.space = value;
        this.setState({
          keys : keys
        });
      }


    gameOver(){
        this.setState({
        inGame: false,
        });

        // Replace top score
        if(this.state.currentScore > this.state.topScore){
        this.setState({
            topScore: this.state.currentScore,
        });
        localStorage['topscore'] = this.state.currentScore;
        }
    }

    update() {
        const context = this.state.context;
        const ship = this.ship[0];
    
        context.save();
        context.scale(this.state.screen.ratio, this.state.screen.ratio);
    
        // Motion trail
        context.fillStyle = '#000';
        context.globalAlpha = 0.4;
        context.fillRect(0, 0, this.state.screen.width, this.state.screen.height);
        context.globalAlpha = 1;
    
        this.updateObjects(this.particles, 'particles')
        this.updateObjects(this.asteroids, 'asteroids')
        this.updateObjects(this.bullets, 'bullets')
        this.updateObjects(this.ship, 'ship')
        context.restore();
    
        // Next frame
        requestAnimationFrame(() => {this.update()});
      }

    render() {
        return (
            <div>
              <span className="controls" >
                Simple Reinforcement learning example<br/>
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

export default Auralux