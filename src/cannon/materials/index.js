import * as CANNON from 'cannon-es';
export const ballMaterial = new CANNON.Material('ball');
export const bumperMaterial = new CANNON.Material('bumper');
export const flipperMaterial = new CANNON.Material('flipper');
export const playFieldMaterial = new CANNON.Material('playfield');
import { CONTACT_MATERIALS } from '@src/App.config';

export const initContactMaterials = ({ world }) => {
// BALL & PLAYFIELD
  const ballAndPlayfield = new CANNON.ContactMaterial(
    playFieldMaterial, 
    ballMaterial, {
      ...CONTACT_MATERIALS.ballAndPlayfield
    }
  );
  world.addContactMaterial(ballAndPlayfield);
// BALL & BUMPER
  const ballAndBumper = new CANNON.ContactMaterial(
    ballMaterial,
    bumperMaterial, {
      ...CONTACT_MATERIALS.ballAndBumper
    }
  );
  world.addContactMaterial(ballAndBumper);
// BALL & FLIPPER
  const ballAndFlipper = new CANNON.ContactMaterial(
    flipperMaterial,
    ballMaterial, {
      ...CONTACT_MATERIALS.ballAndFlipper
    }
    
  );
  world.addContactMaterial(ballAndFlipper)
}