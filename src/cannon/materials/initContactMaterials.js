import * as CANNON from 'cannon-es';
import { MATERIALS } from '@src/cannon/materials/MATERIALS';
import { CONTACT_MATERIALS } from '@src/cannon/materials/CONTACT_MATERIALS';

export const initContactMaterials = ({ world }) => {
// BALL & PLAYFIELD
  const ballAndPlayfield = new CANNON.ContactMaterial(
    MATERIALS.playFieldMaterial, 
    MATERIALS.ballMaterial, 
    { ...CONTACT_MATERIALS.ballAndPlayfield }
  );
  world.addContactMaterial(ballAndPlayfield);
// BALL & BUMPER
  const ballAndBumper = new CANNON.ContactMaterial(
    MATERIALS.ballMaterial,
    MATERIALS.bumperMaterial, 
    { ...CONTACT_MATERIALS.ballAndBumper }
  );
  world.addContactMaterial(ballAndBumper);
// BALL & FLIPPER
  const ballAndFlipper = new CANNON.ContactMaterial(
    MATERIALS.flipperMaterial,
    MATERIALS.ballMaterial,
    { ...CONTACT_MATERIALS.ballAndFlipper }
    
  );
  world.addContactMaterial(ballAndFlipper)
}