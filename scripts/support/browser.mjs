import { chromium } from "playwright";

export const launch = (...args) =>
  chromium.launch({
    channel: process.env.NIGHTWATER_CHANNEL || "chromium",
    headless: true,
    args: ["--ignore-gpu-blocklist", "--enable-webgl", ...args],
  });
