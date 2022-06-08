# pinball-xr
## A three.js and cannon-es webxr pinball web app.

Real-world pinball differs from a video game in that the player is continuously moving their gaze over a physical playfield (like a spectator watching a tennis game).

Given the challenges of moving around in VR, standing in front of a virtual pinball machine might be a good candidate for an immersive experience.

This project will be in three phases:
1. A Cannon-es wireframe that establishes the physics of gameplay.
2. A Three.js 'skin' for the Cannon wireframe.
3. User experience elements including onboarding of VR mode (from the default browser-based experience), sound design, and immersive environment (i.e. arcade). 

To easily test the VR mode without having to continuously don and remove a headset, I am using the [WebXR API Emulator](https://github.com/MozillaReality/WebXR-emulator-extension) by Mozilla Mixed Reality (a great developer tool).

I am currently in the first phase of establishing the physics behavior (see below). Due to the speed of both the ball and the flipper animation, Cannon's collision detection does not work consistently. As a workaround, I created a collision detection method that estimates the point of contact between the ball and the flipper. Given the point of contact along the length of the flipper, the flipper's angle, and the speed of the ball, a rebound vector is generated (still work in progress).

![pinball-xr_1080_30fps](https://user-images.githubusercontent.com/42591798/172470576-f48339d1-73e3-42d2-b01b-2d1ab002a82f.gif)


