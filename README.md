# pinball-xr
## A three.js and cannon-es webxr pinball web app.

Real-world pinball differs from a video game in that the player is continuously moving their gaze over a physical playfield (like a spectator watching a tennis game).

Given the challenges of moving around in VR, standing in front of a virtual pinball machine might be a good candidate for an immersive experience.

### Approach
This project will be in three phases:
1. A [cannon-es](https://github.com/pmndrs/cannon-es) wireframe that establishes the physics of gameplay.
2. A Three.js 'skin' for the Cannon wireframe.
3. User experience elements including onboarding of VR mode (from the default browser-based experience), sound design, and immersive environment (i.e. arcade). 

### Tools
I am initially developing in vanilla Javascript - along with [cannon-es](https://github.com/pmndrs/cannon-es) - with an eye on refactoring to incorporate [react-three-fiber](https://github.com/pmndrs/react-three-fiber) and [zustand](https://github.com/pmndrs/zustand). I suspect that it will help keep my project better organized as it grows.
 
To easily test the VR mode without having to continuously don and remove a headset, I am using the [WebXR API Emulator](https://github.com/MozillaReality/WebXR-emulator-extension) by Mozilla Mixed Reality (a great developer tool).

### Progress
I am currently in the first phase of establishing the physics behavior (see below). Due to the speed of both the ball and the flipper animation, Cannon's collision detection does not work consistently at the target 60fps. As a workaround, I created a collision detection method that estimates the point of contact between the ball and the flipper. Given the point of contact along the length of the flipper, the flipper's angle, and the speed of the ball, a rebound vector is generated (still work in progress).

![pinball-xr_1080_30fps](https://user-images.githubusercontent.com/42591798/172470576-f48339d1-73e3-42d2-b01b-2d1ab002a82f.gif)

## Running Locally

Make sure you have [Node.js](http://nodejs.org/) installed.

```sh
git clone https://github.com/patrick-s-young/pinball-xr.git # or clone your own fork
cd pinball-xr
npm install
npm start
```
- Left Flipper: A Key
- Right Fipper: L Key
- Refresh browser for new ball (or let ball fall down drain).

## Built With

* [cannon-es](https://www.npmjs.com/package/cannon-es) - rigid body physics engine.
* [three.js](https://www.npmjs.com/package/three) - lightweight, cross-browser, general purpose 3D library.
* [cannon-es-debugger](https://www.npmjs.com/package/cannon-es-debugger) - debugger for use with cannon-es.
* [stats.js](https://www.npmjs.com/package/stats-js) - JavaScript performance monitor.
* [webpack](https://webpack.js.org/) - static module builder.
* [WebXR API Emulator](https://chrome.google.com/webstore/detail/webxr-api-emulator/mjddjgeghkdijejnciaefnkjmkafnnje?hl=en) - browser extension enables developers to run and test WebXR content in desktop browsers without using a real XR device.

## Authors

* **Patrick Young** - [Patrick Young](https://github.com/patrick-s-young)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
