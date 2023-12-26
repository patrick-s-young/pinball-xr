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
  this.position = position;
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
  const { x, y, z } = this.position;
  this.body.position.x = x;
  this.body.position.y = y;
  this.body.position.z = z;

  this.body.velocity.x = 0;
  this.body.velocity.y = 0;
  this.body.velocity.z = -35;
}

Ball.prototype.bodyRef = function () {
  return this.body;
}