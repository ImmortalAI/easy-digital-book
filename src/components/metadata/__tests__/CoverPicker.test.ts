import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import CoverPicker from "@/components/metadata/CoverPicker.vue";

describe("CoverPicker", () => {
  it("delegates native choose and dropped image files to import callbacks", async () => {
    const pick = vi.fn<() => Promise<void>>(async () => undefined);
    const onDropFile = vi.fn<
      (file: { name: string; bytes: Uint8Array; type?: string }) => Promise<void>
    >(async () => undefined);
    const wrapper = mount(CoverPicker, { props: { cover: null, onPick: pick, onDropFile } });
    await wrapper.get("button").trigger("click");
    const file = new File([new Uint8Array([1, 2])], "cover.png", { type: "image/png" });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    await wrapper.get(".cover-picker__drop").trigger("drop", { dataTransfer });
    expect(pick).toHaveBeenCalledOnce();
    expect(onDropFile).toHaveBeenCalledWith(expect.objectContaining({ name: "cover.png" }));
  });
});
