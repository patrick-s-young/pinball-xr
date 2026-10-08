import { waterMessages } from './waterMessages';

// Runs the water simulation off the main thread, so the game and rendering never wait for it.
// See waterMessages for the messages.
const handle = waterMessages((message, transfer) => self.postMessage(message, transfer));
self.onmessage = ({ data }) => handle(data);
