import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("metoCockpit", {
  platform: process.platform,
});
