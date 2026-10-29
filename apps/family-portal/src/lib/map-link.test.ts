import { describe, expect, it, vi } from "vitest";
import { resolveShortMapLink } from "./map-link";

function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { location } });
}

describe("resolveShortMapLink", () => {
  it("reads the pin from the redirect target", async () => {
    const fetchImpl = vi.fn(async () =>
      redirect("https://www.google.com/maps/place/Church/@6.44,7.49,17z/data=!3d6.4402!4d7.4943"),
    );
    await expect(
      resolveShortMapLink("https://maps.app.goo.gl/AbC123", fetchImpl as typeof fetch),
    ).resolves.toEqual({ latitude: 6.4402, longitude: 7.4943 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("unwraps Google's EU consent wall instead of following it", async () => {
    const dest = "https://www.google.com/maps?q=6.4402,7.4943";
    const fetchImpl = vi.fn(async () =>
      redirect(`https://consent.google.com/m?continue=${encodeURIComponent(dest)}&gl=IE`),
    );
    await expect(
      resolveShortMapLink("https://maps.app.goo.gl/AbC123", fetchImpl as typeof fetch),
    ).resolves.toEqual({ latitude: 6.4402, longitude: 7.4943 });
  });

  it("follows a short-link chain but never fetches another host", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(redirect("https://goo.gl/maps/Next1"))
      .mockResolvedValueOnce(redirect("http://169.254.169.254/latest/meta-data"));
    await expect(
      resolveShortMapLink("https://maps.app.goo.gl/AbC123", fetchImpl as typeof fetch),
    ).resolves.toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls.map((c) => c[0])).toEqual([
      "https://maps.app.goo.gl/AbC123",
      "https://goo.gl/maps/Next1",
    ]);
  });

  it("refuses to fetch anything that isn't a short link", async () => {
    const fetchImpl = vi.fn();
    await expect(
      resolveShortMapLink("https://example.com/redirect", fetchImpl as typeof fetch),
    ).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns null for a shared text search or a network failure", async () => {
    const textSearch = vi.fn(async () =>
      redirect("https://maps.google.com/?q=Church+Street,+Enugu"),
    );
    await expect(
      resolveShortMapLink("https://maps.app.goo.gl/AbC123", textSearch as typeof fetch),
    ).resolves.toBeNull();

    const failing = vi.fn(async () => {
      throw new Error("ECONNRESET");
    });
    await expect(
      resolveShortMapLink("https://maps.app.goo.gl/AbC123", failing as typeof fetch),
    ).resolves.toBeNull();
  });
});
