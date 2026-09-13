import { chromium } from "playwright";

export const launch = (...args) =>
  chromium.launch({
    channel: process.env.NIGHTWATER_CHANNEL || "msedge",
    headless: true,
    args: ["--ignore-gpu-blocklist", "--enable-webgl", ...args],
  });
