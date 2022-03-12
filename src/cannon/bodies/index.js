import { BallBody } from './BallBody';
import { PlayfieldBody } from './PlayfieldBody';
import { BumperBodies } from './BumperBodies';
import { FlipperBodies } from './FlipperBodies';


export const initCannonBodies = ({ world }) => ({
    playfield: PlayfieldBody({ world }),
    bumpers: BumperBodies({ world }),
    flippers: FlipperBodies({ world }),
    ball: BallBody({ world })
  });