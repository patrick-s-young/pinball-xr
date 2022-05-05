import * as CANNON from 'cannon-es';
import { BALL_CONFIG } from './config';

export function Ball ({ world }) {
  const {
    mass,
    radius,
    position,
    material,
    collisionFilterGroup,
    collisionFilterMask
  } = BALL_CONFIG;
  this.spawn = this.spawn.bind(this);
  this.bodyRef = this.bodyRef.bind(this);
  this.body = new CANNON.Body({
    mass, 
    material,
    position,
    collisionFilterGroup,
    collisionFilterMask
    }
  );
  const shape = new CANNON.Sphere(radius);
  this.body.addShape(shape);
  world.addBody(this.body);
}

Ball.prototype.spawn = function () {
  this.body.velocity.x = 10 + Math.random() * 7.25;
  this.body.velocity.z = 6;
}

Ball.prototype.bodyRef = function () {
  return this.body;
}