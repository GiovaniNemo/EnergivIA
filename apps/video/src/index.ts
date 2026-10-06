// This is your entry file! Refer to it when you render:
// npx remotion render <entry-file> HelloWorld out/video.mp4

import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
registerRoot(RemotionRoot as any);
