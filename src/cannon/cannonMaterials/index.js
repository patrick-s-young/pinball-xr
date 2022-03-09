import * as CANNON from 'cannon-es';
export const ballMaterial = new CANNON.Material('ball');
export const bumperMaterial = new CANNON.Material('bumper');
export const flipperMaterial = new CANNON.Material('flipper');
export const playFieldMaterial = new CANNON.Material('playfield');


export const initContactMaterials = ({ world }) => {
// BALL & PLAYFIELD
  const slipperyContact = new CANNON.ContactMaterial(
    playFieldMaterial, 
    ballMaterial, {
    friction: 0.0,
    restitution: 0.1
    }
  );
  world.addContactMaterial(slipperyContact);
// BALL & BUMPER
  const bumperContact = new CANNON.ContactMaterial(
    ballMaterial,
    bumperMaterial, {
    friction: 0.0,
    restitution: 0.1
    }
  );
  world.addContactMaterial(bumperContact);
//  BALL & FLIPPER
  const flipperContact = new CANNON.ContactMaterial(
    ballMaterial,
    flipperMaterial, {
    friction: 0.4,
    restitution: 0.8
    }
  );
  world.addContactMaterial(flipperContact);
}