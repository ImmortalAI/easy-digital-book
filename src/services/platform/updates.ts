import type { Updates } from "@/types/platform";
export const noUpdates: Updates = {
  async check() {
    return false;
  },
  async install() {},
};
