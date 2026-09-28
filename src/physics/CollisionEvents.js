// Routes Rapier's collision-start events to handlers registered per collider.
// Only the ball enables events, so every event pairs the ball with one other collider.
// Handlers take no arguments.
export const CollisionEvents = ({ RAPIER }) => {
  const eventQueue = new RAPIER.EventQueue(true);
  const handlers = new Map();

  const onCollisionStart = (collider, handler) => handlers.set(collider.handle, handler);

  const dispatch = () => {
    eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      if (started === false) return;
      handlers.get(handle1)?.();
      handlers.get(handle2)?.();
    });
  }

  return { eventQueue, onCollisionStart, dispatch };
}
