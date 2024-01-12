# pinball-ar
## A three.js and cannon-es webxr pinball web app.

Real-world pinball differs from a video game in that the player is continuously moving their gaze over a physical playfield (like a spectator watching a tennis game).

Given the current strengths and weaknesses of mobile-based AR, standing in front of a virtual pinball machine could be a compelling mixed-reality experience.

### Approach
This project will be in three phases:
1. A [cannon-es](https://github.com/pmndrs/cannon-es) wireframe that establishes the physics of gameplay.
2. ARCore implementation. 
3. A Three.js 'skin' on top of the cannon-es physics bodies (plus sound design).

### Tools
I am initially developing in vanilla Javascript - along with [cannon-es](https://github.com/pmndrs/cannon-es) - with an eye on refactoring to incorporate [react-three-fiber](https://github.com/pmndrs/react-three-fiber) and [zustand](https://github.com/pmndrs/zustand).


### Progress
I am establishing a baseline for the pinball game's physics behavior in WebXR. The videos below depict cannon-es in debugger mode. In addition to the WebXR mode, there is a desktop browser 'emulation' mode that enables faster iteration when developing non-WebXR functionality.

WebXR mode 'yarn start'

https://github.com/patrick-s-young/pinball-xr/assets/42591798/183ca26b-f026-4679-96cc-62b63bbda7bf

Emulation mode 'yarn dev'

https://github.com/patrick-s-young/pinball-xr/assets/42591798/b6b28d8c-4b32-42d3-8488-d6a1503cda5b


## Running Locally

Make sure you have [Node.js](http://nodejs.org/) installed.

```sh
git clone https://github.com/patrick-s-young/pinball-xr.git # or clone your own fork
cd pinball-xr
yarn (to install)
yarn start (for WebXR mode)
yarn dev (for AR emulation mode)
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

## Authors

* **Patrick Young** - [Patrick Young](https://github.com/patrick-s-young)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
