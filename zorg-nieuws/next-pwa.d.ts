declare module "next-pwa" {
  import type { NextConfig } from "next";
  interface PWAOptions {
    dest: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
  }
  function withPWAInit(options: PWAOptions): (config: NextConfig) => NextConfig;
  export default withPWAInit;
}
