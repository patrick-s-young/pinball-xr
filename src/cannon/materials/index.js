import * as CANNON from 'cannon-es';
export const ballMaterial = new CANNON.Material('ball');
export const bumperMaterial = new CANNON.Material('bumper');
export const flipperMaterial = new CANNON.Material('flipper');
export const playFieldMaterial = new CANNON.Material('playfield');


export const initContactMaterials = ({ world }) => {
// BALL & PLAYFIELD
  const ballAndPlayfield = new CANNON.ContactMaterial(
    playFieldMaterial, 
    ballMaterial, {
    friction: 0.1,
    restitution: 0.6
    }
  );
  world.addContactMaterial(ballAndPlayfield);
// BALL & BUMPER
  const ballAndBumper = new CANNON.ContactMaterial(
    ballMaterial,
    bumperMaterial, {
    friction: 0.0,
    restitution: 0.5
    }
  );
  world.addContactMaterial(ballAndBumper);
// BALL & FLIPPER
  const ballAndFlipper = new CANNON.ContactMaterial(
    flipperMaterial,
    ballMaterial, {
    friction: 0.2,
    restitution: 0.7
    }
    
  );
  world.addContactMaterial(ballAndFlipper)
}