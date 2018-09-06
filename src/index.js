import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import { Reacteroids } from './Reacteroids-RL/Reacteroids';
import registerServiceWorker from './registerServiceWorker';

ReactDOM.render(<Reacteroids />, document.getElementById('root'));
registerServiceWorker();
