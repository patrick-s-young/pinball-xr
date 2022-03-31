// to do: make function prototype that throttles keyDown messages.

function KeyEvents () {
  this.subscribers = {
    keydown: {},
    keyup: {}
  }
  this.addSubscriber = this.addSubscriber.bind(this);
  this.onKeyDown = this.onKeyDown.bind(this);
  this.onKeyUp = this.onKeyUp.bind(this);
  this.keyState = {};
  document.addEventListener('keydown', this.onKeyDown);
  document.addEventListener('keyup', this.onKeyUp);
}

KeyEvents.prototype.addSubscriber = function ({
  keyName,
  keyAction,
  callBack
  }) {
    if (this.subscribers[keyAction][keyName] === undefined) {
      this.subscribers[keyAction][keyName] = [callBack];
    } else {
      this.subscribers[keyAction][keyName].push(callBack);
    }
    this.keyState[keyName] = 'keyup';
}

KeyEvents.prototype.onKeyDown = function ({ code:keyName }) {

  if (this.subscribers.keydown[keyName] === undefined) return;
  if (this.keyState[keyName] === 'keydown') return;
  console.log('this.keyState[keyName]:', this.keyState[keyName])
  this.subscribers.keydown[keyName].forEach(callBack => callBack());
  this.keyState[keyName] = 'keydown';
}

KeyEvents.prototype.onKeyUp = function ({ code:keyName }) {
  if (this.subscribers.keyup[keyName] === undefined) return;
  this.subscribers.keyup[keyName].forEach(callBack => callBack());
  this.keyState[keyName] = 'keyup';
  console.log('this.keyState[keyName]:', this.keyState[keyName])
}

export default KeyEvents;
